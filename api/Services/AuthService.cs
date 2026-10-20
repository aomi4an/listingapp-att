using ListingsApi.Auth;
using ListingsApi.Contracts;
using ListingsApi.Data;
using ListingsApi.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Services;

public enum ChangePasswordResult { Ok, UserNotFound, WrongPassword }

public class AuthService(AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens)
{
    public static string Normalize(string? email) => (email ?? "").Trim().ToLowerInvariant();

    // null = email успели занять между проверкой валидатора и вставкой (редкая гонка)
    public async Task<AuthResponse?> RegisterAsync(RegisterRequest r)
    {
        var user = new User { Email = Normalize(r.Email), CreatedAt = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, r.Password);

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            return null;                                // нарушен уникальный индекс по Email
        }
        return Issue(user);                             // сразу вошёл
    }

    // null = неверный email или пароль (не говорим, что именно)
    public async Task<AuthResponse?> LoginAsync(LoginRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Email) || string.IsNullOrEmpty(r.Password)) return null;

        var email = Normalize(r.Email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null) return null;

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, r.Password);
        if (result == PasswordVerificationResult.Failed) return null;

        return Issue(user);
    }

    public async Task<ChangePasswordResult> ChangePasswordAsync(int userId, ChangePasswordRequest r)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return ChangePasswordResult.UserNotFound;

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, r.CurrentPassword) == PasswordVerificationResult.Failed)
            return ChangePasswordResult.WrongPassword;

        user.PasswordHash = hasher.HashPassword(user, r.NewPassword);
        await db.SaveChangesAsync();
        return ChangePasswordResult.Ok;
    }

    private AuthResponse Issue(User user)
    {
        var (token, expires) = tokens.Create(user);
        return new AuthResponse(token, expires, user.Id, user.Email);
    }
}
