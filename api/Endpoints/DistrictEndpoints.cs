using ListingsApi.Contracts;
using ListingsApi.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace ListingsApi.Endpoints;

public static class DistrictEndpoints
{
    public static void MapDistrictEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/districts").WithTags("Districts");

        group.MapGet("/", async (DistrictService service) =>
                TypedResults.Ok(await service.GetAllAsync()))
           .WithName("GetDistricts")
           .WithSummary("Справочник районов с числом объявлений");

        group.MapPost("/", async Task<Results<Created<DistrictResponse>, BadRequest<string>, Conflict<string>>>
            (DistrictRequest request, DistrictService service) =>
        {
            var error = Validate(request.Name);
            if (error is not null) return TypedResults.BadRequest(error);

            var created = await service.CreateAsync(request.Name);
            if (created is null) return TypedResults.Conflict("Район с таким названием уже есть");
            return TypedResults.Created($"/api/districts/{created.Id}", created);
        })
        .AddEndpointFilter<AdminKeyFilter>()
        .WithName("CreateDistrict")
        .WithSummary("Добавить район");

        group.MapPut("/{id:int}", async Task<Results<NoContent, NotFound, BadRequest<string>, Conflict<string>>>
            (int id, DistrictRequest request, DistrictService service) =>
        {
            var error = Validate(request.Name);
            if (error is not null) return TypedResults.BadRequest(error);

            return await service.UpdateAsync(id, request.Name) switch
            {
                DistrictResult.NotFound => TypedResults.NotFound(),
                DistrictResult.DuplicateName => TypedResults.Conflict("Район с таким названием уже есть"),
                _ => (Results<NoContent, NotFound, BadRequest<string>, Conflict<string>>)TypedResults.NoContent(),
            };
        })
        .AddEndpointFilter<AdminKeyFilter>()
        .WithName("UpdateDistrict")
        .WithSummary("Переименовать район");

        group.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound, Conflict<string>>>
            (int id, DistrictService service) =>
        {
            return await service.DeleteAsync(id) switch
            {
                DistrictResult.NotFound => TypedResults.NotFound(),
                DistrictResult.HasListings => TypedResults.Conflict("В районе есть объявления — сначала удалите или перенесите их"),
                _ => (Results<NoContent, NotFound, Conflict<string>>)TypedResults.NoContent(),
            };
        })
        .AddEndpointFilter<AdminKeyFilter>()
        .WithName("DeleteDistrict")
        .WithSummary("Удалить район (только пустой)");
    }

    private static string? Validate(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "Поле name обязательно";
        if (name.Trim().Length > 100) return "Поле name — не длиннее 100 символов";
        return null;
    }
}
