namespace ListingsApi.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // Страница /#admin вызывает это, чтобы проверить введённый ключ.
        // 204 — ключ верный (или защита выключена), 401 — неверный.
        app.MapGet("/api/admin/ping", () => Results.NoContent())
           .AddEndpointFilter<AdminKeyFilter>()
           .WithTags("Admin")
           .WithName("AdminPing")
           .WithSummary("Проверка ключа администратора");
    }
}
