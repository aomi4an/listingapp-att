using System.Text;
using System.Text.Json;
using FluentValidation;
using ListingsApi.Auth;
using ListingsApi.Data;
using ListingsApi.Data.Entities;
using ListingsApi.Endpoints;
using ListingsApi.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- База: SQLite-файл. Путь считаем от папки приложения, а не от текущей папки терминала ---
var rawConnection = builder.Configuration.GetConnectionString("Default") ?? "Data Source=App_Data/listings.db";
var csb = new SqliteConnectionStringBuilder(rawConnection);
csb.DataSource = Path.GetFullPath(csb.DataSource, builder.Environment.ContentRootPath);
Directory.CreateDirectory(Path.GetDirectoryName(csb.DataSource)!);

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(csb.ToString()));
builder.Services.AddScoped<ListingService>();
builder.Services.AddScoped<DistrictService>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddOpenApi();

// --- Урок 6: FluentValidation и единый формат ошибок (ProblemDetails) ---
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
// ключи ошибок — как в JSON: title, а не Title
ValidatorOptions.Global.PropertyNameResolver = (type, member, expression) =>
    member is null ? null : JsonNamingPolicy.CamelCase.ConvertName(member.Name);
builder.Services.AddProblemDetails();

// --- Урок 7: пользователи, пароли, JWT ---
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Не задан ключ подписи токенов Jwt:Key (нужна случайная строка не короче 32 символов). " +
        "Локально: dotnet user-secrets set \"Jwt:Key\" \"<длинная случайная строка>\". " +
        "На сервере: переменная окружения Jwt__Key.");
}

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;            // claim "sub" остаётся "sub"
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        };
    })
    // Вторая схема: заголовок X-Admin-Key (страница /admin) даёт роль Admin
    .AddScheme<AuthenticationSchemeOptions, AdminKeyAuthenticationHandler>(
        AdminKeyAuthenticationHandler.SchemeName, _ => { });

builder.Services.AddAuthorization(options =>
{
    // RequireAuthorization() без параметров: подходит токен пользователя ИЛИ ключ администратора
    options.DefaultPolicy = new AuthorizationPolicyBuilder(
            JwtBearerDefaults.AuthenticationScheme, AdminKeyAuthenticationHandler.SchemeName)
        .RequireAuthenticatedUser()
        .Build();
});

// CORS нужен только при разработке (Angular на :4200, API на :5000).
// На сервере фронтенд и API отдаются с одного адреса — CORS не задействован.
// AllowAnyHeader/AllowAnyMethod нужны, чтобы браузер пропустил заголовки Authorization и X-Admin-Key.
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:4200" };
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// --- Создание/обновление базы при старте ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DatabaseBootstrap.Apply(db);   // миграции есть -> Migrate, нет -> EnsureCreated (см. DatabaseBootstrap.cs)
}

// Порядок важен: ошибки -> CORS -> файлы -> «кто ты» -> «что тебе можно» -> endpoint'ы
app.UseExceptionHandler();                     // необработанное исключение -> 500 problem+json
app.UseStatusCodePages();                      // пустой 404/401/403 -> problem+json
app.UseCors();

// --- Фронтенд (Angular собирается в wwwroot) ---
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// --- Swagger: в разработке всегда, на сервере — только если Swagger:Enabled=true ---
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Listings API v1");
        options.RoutePrefix = "swagger";
    });
}

app.MapAuthEndpoints();
app.MapListingEndpoints();
app.MapDistrictEndpoints();
app.MapAdminEndpoints();

// --- Маршруты Angular (/listings/5, /login, /admin ...): при F5 отдаём index.html ---
// Неизвестный адрес под /api — честный 404, а не страница сайта.
app.MapFallback("/api/{**rest}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();
