using System.Security.Cryptography;
using System.Text;

namespace ListingsApi.Endpoints;

/// <summary>
/// Защита операций записи (POST/PUT/DELETE). Если в настройках задан Admin:ApiKey,
/// запрос должен содержать заголовок X-Admin-Key с тем же значением.
/// Если ключ пустой — защита выключена (режим учебных уроков).
/// </summary>
public class AdminKeyFilter(IConfiguration config) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var expected = config["Admin:ApiKey"];
        if (!string.IsNullOrEmpty(expected))
        {
            var given = context.HttpContext.Request.Headers["X-Admin-Key"].ToString();
            var ok = CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(expected));
            if (!ok) return Results.Unauthorized();
        }
        return await next(context);
    }
}
