namespace ListingsApi.Data.Entities;

public class District
{
    public int Id { get; set; }
    public string Name { get; set; } = "";

    public List<Listing> Listings { get; set; } = new();
}
