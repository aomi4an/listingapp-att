namespace ListingsApi.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = "";          // всегда в нижнем регистре
    public string PasswordHash { get; set; } = "";   // никогда не сам пароль
    public DateTime CreatedAt { get; set; }

    public List<Listing> Listings { get; set; } = [];
}
