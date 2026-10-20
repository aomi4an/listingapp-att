using System.Security.Claims;
using ListingsApi.Auth;
using ListingsApi.Contracts;
using ListingsApi.Services;
using ListingsApi.Validators;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ListingsApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async Task<Results<Ok<AuthResponse>, ValidationProblem>>
            (RegisterRequest r, AuthService auth) =>
        {
            var res = await auth.RegisterAsync(r);
            if (res is null)
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["email"] = ["Этот email уже зарегистрирован"]
                });
            return TypedResults.Ok(res);
        })
        .AddEndpointFilter<ValidationFilter<RegisterRequest>>()
        .ProducesValidationProblem()
        .WithName("Register")
        .WithSummary("Регистрация; сразу возвращает токен");

        group.MapPost("/login", async Task<Results<Ok<AuthResponse>, ProblemHttpResult>>
            (LoginRequest r, AuthService auth) =>
        {
            var res = await auth.LoginAsync(r);
            if (res is null)
                return TypedResults.Problem("Неверный email или пароль", statusCode: 401);
            return TypedResults.Ok(res);
        })
        .WithName("Login")
        .WithSummary("Вход; одинаковая ошибка для неизвестного email и неверного пароля");

        group.MapGet("/me", Results<Ok<MeResponse>, UnauthorizedHttpResult> (ClaimsPrincipal user) =>
        {
            if (user.GetUserId() is not { } id) return TypedResults.Unauthorized();
            return TypedResults.Ok(new MeResponse(id, user.FindFirstValue(JwtRegisteredClaimNames.Email) ?? ""));
        })
        .RequireAuthorization()
        .WithName("Me")
        .WithSummary("Кто я: по токену");

        group.MapPost("/change-password", async Task<Results<NoContent, ValidationProblem, UnauthorizedHttpResult>>
            (ChangePasswordRequest r, ClaimsPrincipal user, AuthService auth) =>
        {
            if (user.GetUserId() is not { } userId) return TypedResults.Unauthorized();

            var result = await auth.ChangePasswordAsync(userId, r);
            if (result == ChangePasswordResult.UserNotFound) return TypedResults.Unauthorized();
            if (result == ChangePasswordResult.WrongPassword)
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["currentPassword"] = ["Неверный текущий пароль"]
                });
            return TypedResults.NoContent();
        })
        .RequireAuthorization()
        .AddEndpointFilter<ValidationFilter<ChangePasswordRequest>>()
        .ProducesValidationProblem()
        .WithName("ChangePassword")
        .WithSummary("Смена пароля: старый + новый");
    }
}
