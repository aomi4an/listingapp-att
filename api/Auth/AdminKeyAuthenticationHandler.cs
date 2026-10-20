using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace ListingsApi.Auth;

/// <summary>
/// Вторая схема аутентификации рядом с JWT: запрос с верным заголовком X-Admin-Key
/// получает роль Admin. Так страница /admin (вход по ключу) продолжает работать, а
/// администратор может менять и удалять любые объявления.
/// Если Admin:ApiKey не задан — администратора нет вообще (в отличие от районов,
/// где пустой ключ означает «защита выключена»: объявления теперь защищены токеном).
/// </summary>
public class AdminKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration config)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "AdminKey";
    public const string AdminRole = "Admin";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var expected = config["Admin:ApiKey"];
        if (string.IsNullOrEmpty(expected) || !Request.Headers.TryGetValue("X-Admin-Key", out var values))
            return Task.FromResult(AuthenticateResult.NoResult());

        var given = values.ToString();
        var ok = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
        if (!ok)
            return Task.FromResult(AuthenticateResult.Fail("Неверный ключ администратора"));

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "admin"), new Claim(ClaimTypes.Role, AdminRole)],
            SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
