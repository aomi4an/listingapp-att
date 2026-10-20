using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ListingsApi.Auth;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Id пользователя из claim «sub». null — запрос пришёл не с токеном пользователя
    /// (например, с ключом администратора).
    /// </summary>
    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;

    /// <summary>Запрос выполнен с верным ключом администратора (заголовок X-Admin-Key).</summary>
    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole(AdminKeyAuthenticationHandler.AdminRole);
}
