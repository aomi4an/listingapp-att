namespace ListingsApi.Auth;

public class JwtOptions
{
    public string Issuer { get; init; } = "";
    public string Audience { get; init; } = "";
    public string Key { get; init; } = "";        // из user-secrets / переменной Jwt__Key, не из appsettings!
    public int ExpiresMinutes { get; init; } = 60;
}
