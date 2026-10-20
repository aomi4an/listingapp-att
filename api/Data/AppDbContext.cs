using ListingsApi.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ListingsApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<District> Districts => Set<District>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // SQLite отдаёт DateTime с Kind=Unspecified, и JSON уходит без "Z".
        // Говорим EF, что в базе всегда UTC — тогда в JSON будет 2026-09-01T00:00:00Z.
        var utc = new ValueConverter<DateTime, DateTime>(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        b.Entity<District>(e =>
        {
            e.Property(d => d.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(d => d.Name).IsUnique();
        });

        b.Entity<User>(e =>
        {
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.CreatedAt).HasConversion(utc);
        });

        b.Entity<Listing>(e =>
        {
            e.Property(l => l.Title).HasMaxLength(200).IsRequired();
            e.Property(l => l.Address).HasMaxLength(300);
            e.Property(l => l.CreatedAt).HasConversion(utc);

            // SQLite не умеет decimal «по-настоящему» — храним как double.
            // При переходе на PostgreSQL эту строку убрать.
            e.Property(l => l.Price).HasConversion<double>();

            e.HasOne(l => l.District)
             .WithMany(d => d.Listings)
             .HasForeignKey(l => l.DistrictId)
             .OnDelete(DeleteBehavior.Restrict);

            // Автор: при удалении пользователя объявления остаются без автора
            e.HasOne(l => l.Owner)
             .WithMany(u => u.Listings)
             .HasForeignKey(l => l.OwnerId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // --- начальные данные (только константы!) ---
        b.Entity<District>().HasData(
            new District { Id = 1, Name = "Чиланзар" },
            new District { Id = 2, Name = "Юнусабад" },
            new District { Id = 3, Name = "Мирзо-Улугбек" });

        static DateTime D(int day, int h, int m) => new(2026, 9, day, h, m, 0, DateTimeKind.Utc);

        b.Entity<Listing>().HasData(
            new Listing { Id = 1, Title = "2-комн. рядом с метро Чиланзар", Price = 48000, Rooms = 2, DistrictId = 1, CreatedAt = D(1, 9, 0),   Address = "Чиланзар, 12 кв., д. 4" },
            new Listing { Id = 2, Title = "3-комн. с ремонтом",             Price = 71000, Rooms = 3, DistrictId = 2, CreatedAt = D(5, 10, 30) },
            new Listing { Id = 3, Title = "1-комн. студия",                 Price = 32000, Rooms = 1, DistrictId = 3, CreatedAt = D(8, 14, 0) },
            new Listing { Id = 4, Title = "4-комн. с видом на парк",        Price = 95000, Rooms = 4, DistrictId = 2, CreatedAt = D(12, 8, 15),  Address = "Юнусабад, 4 кв." },
            new Listing { Id = 5, Title = "2-комн. после ремонта, тихий двор", Price = 52000, Rooms = 2, DistrictId = 1, CreatedAt = D(15, 11, 0) },
            new Listing { Id = 6, Title = "1-комн. у ТРЦ",                  Price = 36000, Rooms = 1, DistrictId = 2, CreatedAt = D(18, 16, 45) },
            new Listing { Id = 7, Title = "3-комн. семейная",               Price = 66000, Rooms = 3, DistrictId = 3, CreatedAt = D(20, 9, 30) },
            new Listing { Id = 8, Title = "2-комн. срочно, торг",           Price = 39000, Rooms = 2, DistrictId = 1, CreatedAt = D(24, 12, 0) });
    }
}
