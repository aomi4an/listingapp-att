namespace ListingsApi.Contracts;

// Поля, которые есть и при создании, и при изменении — по ним общий валидатор (урок 6)
public interface IListingFields
{
    string Title { get; }
    decimal Price { get; }
    int Rooms { get; }
    int DistrictId { get; }
    string? Address { get; }
}

public record CreateListingRequest(string Title, decimal Price, int Rooms, int DistrictId, string? Address = null)
    : IListingFields;

public record UpdateListingRequest(string Title, decimal Price, int Rooms, int DistrictId, string? Address = null)
    : IListingFields;

// OwnerId — id автора (урок 7); null у объявлений без автора. Порядок полей = порядок в проекции ToResponse.
public record ListingResponse(
    int Id, string Title, decimal Price, int Rooms,
    int DistrictId, string DistrictName, string? Address, DateTime CreatedAt,
    int? OwnerId);

public record DistrictResponse(int Id, string Name, int ListingsCount);

public record CountResponse(int Count);

public record DistrictRequest(string Name);
