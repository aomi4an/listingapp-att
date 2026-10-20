using ListingsApi.Contracts;
using ListingsApi.Data;
using ListingsApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Services;

public enum DistrictResult { Ok, NotFound, DuplicateName, HasListings }

public class DistrictService(AppDbContext db)
{
    public async Task<List<DistrictResponse>> GetAllAsync() =>
        await db.Districts.AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DistrictResponse(d.Id, d.Name, d.Listings.Count))
            .ToListAsync();

    // null = район с таким именем уже есть (endpoint вернёт 409)
    public async Task<DistrictResponse?> CreateAsync(string name)
    {
        name = name.Trim();
        if (await db.Districts.AnyAsync(d => d.Name == name)) return null;

        var district = new District { Name = name };
        db.Districts.Add(district);
        await db.SaveChangesAsync();
        return new DistrictResponse(district.Id, district.Name, 0);
    }

    public async Task<DistrictResult> UpdateAsync(int id, string name)
    {
        name = name.Trim();
        var district = await db.Districts.FindAsync(id);
        if (district is null) return DistrictResult.NotFound;
        if (await db.Districts.AnyAsync(d => d.Name == name && d.Id != id)) return DistrictResult.DuplicateName;

        district.Name = name;
        await db.SaveChangesAsync();
        return DistrictResult.Ok;
    }

    public async Task<DistrictResult> DeleteAsync(int id)
    {
        var district = await db.Districts.FindAsync(id);
        if (district is null) return DistrictResult.NotFound;
        // В модели DeleteBehavior.Restrict: район с объявлениями удалять нельзя
        if (await db.Listings.AnyAsync(l => l.DistrictId == id)) return DistrictResult.HasListings;

        db.Districts.Remove(district);
        await db.SaveChangesAsync();
        return DistrictResult.Ok;
    }
}
