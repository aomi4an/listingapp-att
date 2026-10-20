namespace ListingsApi.Data.Entities;

public class Listing
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public decimal Price { get; set; }
    public int Rooms { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; }

    public int DistrictId { get; set; }        // внешний ключ
    public District? District { get; set; }    // навигационное свойство

    // Автор объявления. null — у объявлений из HasData и у созданных из админки.
    public int? OwnerId { get; set; }
    public User? Owner { get; set; }
}
