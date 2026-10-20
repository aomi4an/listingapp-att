using System.Linq.Expressions;
using ListingsApi.Contracts;
using ListingsApi.Data;
using ListingsApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Services;

public enum ChangeResult { Ok, NotFound, Forbidden, BadDistrict }

public class ListingService(AppDbContext db)
{
    // Проекция в DTO — одна на все методы чтения (EF превращает её в SELECT с JOIN)
    private static readonly Expression<Func<Listing, ListingResponse>> ToResponse =
        l => new ListingResponse(l.Id, l.Title, l.Price, l.Rooms,
                                 l.DistrictId, l.District!.Name, l.Address, l.CreatedAt, l.OwnerId);

    public async Task<List<ListingResponse>> GetAllAsync(int? districtId, decimal? maxPrice)
    {
        var query = db.Listings.AsNoTracking().AsQueryable();

        if (districtId is not null) query = query.Where(l => l.DistrictId == districtId);
        if (maxPrice is not null)   query = query.Where(l => l.Price <= maxPrice);

        return await query
            .OrderByDescending(l => l.CreatedAt)
            .Select(ToResponse)
            .ToListAsync();
    }

    // Объявления одного автора (страница «Мои объявления»)
    public async Task<List<ListingResponse>> GetByOwnerAsync(int ownerId) =>
        await db.Listings.AsNoTracking()
            .Where(l => l.OwnerId == ownerId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(ToResponse)
            .ToListAsync();

    public async Task<int> CountAsync() => await db.Listings.CountAsync();

    public async Task<ListingResponse?> GetAsync(int id) =>
        await db.Listings.AsNoTracking()
            .Where(l => l.Id == id)
            .Select(ToResponse)
            .FirstOrDefaultAsync();

    // ownerId = null — объявление создаёт администратор по ключу, автора нет.
    // Результат null = район не найден (endpoint вернёт 400; обычно это ловит валидатор).
    public async Task<ListingResponse?> CreateAsync(CreateListingRequest r, int? ownerId)
    {
        if (!await db.Districts.AnyAsync(d => d.Id == r.DistrictId))
            return null;

        var listing = new Listing
        {
            Title = r.Title.Trim(), Price = r.Price, Rooms = r.Rooms,
            Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address.Trim(),
            DistrictId = r.DistrictId, CreatedAt = DateTime.UtcNow,
            OwnerId = ownerId,
        };
        db.Listings.Add(listing);
        await db.SaveChangesAsync();

        return (await GetAsync(listing.Id))!;
    }

    public async Task<ChangeResult> UpdateAsync(int id, UpdateListingRequest r, int? userId, bool isAdmin)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing is null) return ChangeResult.NotFound;
        if (!CanChange(listing, userId, isAdmin)) return ChangeResult.Forbidden;
        if (!await db.Districts.AnyAsync(d => d.Id == r.DistrictId)) return ChangeResult.BadDistrict;

        listing.Title = r.Title.Trim();
        listing.Price = r.Price;
        listing.Rooms = r.Rooms;
        listing.Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address.Trim();
        listing.DistrictId = r.DistrictId;
        await db.SaveChangesAsync();
        return ChangeResult.Ok;
    }

    public async Task<ChangeResult> DeleteAsync(int id, int? userId, bool isAdmin)
    {
        var listing = await db.Listings.FindAsync(id);
        if (listing is null) return ChangeResult.NotFound;
        if (!CanChange(listing, userId, isAdmin)) return ChangeResult.Forbidden;

        db.Listings.Remove(listing);
        await db.SaveChangesAsync();
        return ChangeResult.Ok;
    }

    // Менять может автор или администратор. У объявления без автора (OwnerId = null)
    // автора нет ни у кого: null == null не даёт прав.
    private static bool CanChange(Listing listing, int? userId, bool isAdmin) =>
        isAdmin || (userId is not null && listing.OwnerId == userId);
}
