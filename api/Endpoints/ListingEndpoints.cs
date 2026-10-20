using System.Security.Claims;
using ListingsApi.Auth;
using ListingsApi.Contracts;
using ListingsApi.Services;
using ListingsApi.Validators;
using Microsoft.AspNetCore.Http.HttpResults;

namespace ListingsApi.Endpoints;

public static class ListingEndpoints
{
    public static void MapListingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/listings").WithTags("Listings");

        // --- чтение: открыто всем ---

        group.MapGet("/", async (ListingService service, int? districtId, decimal? maxPrice) =>
            TypedResults.Ok(await service.GetAllAsync(districtId, maxPrice)))
        .WithName("GetListings")
        .WithSummary("Список объявлений с фильтром по району (id) и максимальной цене");

        // ВАЖНО: /count и /mine объявлены до /{id:int}
        group.MapGet("/count", async (ListingService service) =>
            TypedResults.Ok(new CountResponse(await service.CountAsync())))
        .WithName("CountListings")
        .WithSummary("Количество объявлений");

        // Только для вошедших. Для администратора по ключу (у него нет id пользователя) — пустой список.
        group.MapGet("/mine", async (ClaimsPrincipal user, ListingService service) =>
        {
            var ownerId = user.GetUserId();
            var list = ownerId is null ? new List<ListingResponse>() : await service.GetByOwnerAsync(ownerId.Value);
            return TypedResults.Ok(list);
        })
        .RequireAuthorization()
        .WithName("MyListings")
        .WithSummary("Объявления текущего пользователя");

        group.MapGet("/{id:int}", async Task<Results<Ok<ListingResponse>, NotFound>>
            (int id, ListingService service) =>
        {
            var dto = await service.GetAsync(id);
            if (dto is null) return TypedResults.NotFound();
            return TypedResults.Ok(dto);
        })
        .WithName("GetListing")
        .WithSummary("Одно объявление по id");

        // --- запись: нужен токен пользователя (или ключ администратора) ---
        // Порядок: авторизация (401) -> валидация (400) -> тело endpoint'а (403/404/201/204)

        group.MapPost("/", async Task<Results<Created<ListingResponse>, ValidationProblem>>
            (CreateListingRequest request, ClaimsPrincipal user, ListingService service) =>
        {
            var created = await service.CreateAsync(request, user.GetUserId());
            if (created is null)    // район удалили между проверкой и вставкой — редко, но возможно
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["districtId"] = ["Район не найден"]
                });

            return TypedResults.Created($"/api/listings/{created.Id}", created);
        })
        .RequireAuthorization()
        .AddEndpointFilter<ValidationFilter<CreateListingRequest>>()
        .ProducesValidationProblem()
        .WithName("CreateListing")
        .WithSummary("Создать объявление (автор — текущий пользователь)");

        group.MapPut("/{id:int}", async Task<Results<NoContent, NotFound, ForbidHttpResult, ValidationProblem>>
            (int id, UpdateListingRequest request, ClaimsPrincipal user, ListingService service) =>
        {
            var result = await service.UpdateAsync(id, request, user.GetUserId(), user.IsAdmin());
            if (result == ChangeResult.NotFound) return TypedResults.NotFound();
            if (result == ChangeResult.Forbidden) return TypedResults.Forbid();
            if (result == ChangeResult.BadDistrict)
                return TypedResults.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["districtId"] = ["Район не найден"]
                });
            return TypedResults.NoContent();
        })
        .RequireAuthorization()
        .AddEndpointFilter<ValidationFilter<UpdateListingRequest>>()
        .ProducesValidationProblem()
        .WithName("UpdateListing")
        .WithSummary("Заменить объявление целиком (только автор)");

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound, ForbidHttpResult>>
            (int id, ClaimsPrincipal user, ListingService service) =>
        {
            var result = await service.DeleteAsync(id, user.GetUserId(), user.IsAdmin());
            if (result == ChangeResult.NotFound) return TypedResults.NotFound();
            if (result == ChangeResult.Forbidden) return TypedResults.Forbid();
            return TypedResults.NoContent();
        })
        .RequireAuthorization()
        .WithName("DeleteListing")
        .WithSummary("Удалить объявление (только автор)");
    }
}
