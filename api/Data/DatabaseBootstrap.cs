using System.Data;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Data;

/// <summary>
/// Приводит базу в актуальное состояние при старте приложения.
/// 1) Миграций в проекте нет  -> EnsureCreated (схема из модели) + доводка старой базы (см. ниже).
/// 2) Миграции есть           -> Migrate (применяет недостающие).
/// 3) База создана РАНЬШЕ через EnsureCreated (есть таблицы, нет истории миграций) —
///    например, рабочая база на сервере. Без этого шага Migrate упал бы на
///    «table Districts already exists». Мы «усыновляем» её: записываем в
///    __EFMigrationsHistory, что все миграции уже применены, данные не трогаем.
///    Это верно, только если схема базы совпадает с последней миграцией
///    (то есть база создана из текущей модели — с Address, Users и OwnerId).
///    Поэтому перед усыновлением старую базу доводим до текущей модели (UpgradeLegacySchema).
///
/// UpgradeLegacySchema (урок 7) добавляет таблицу Users и столбец Listings.OwnerId в базе,
/// которая была создана до появления аутентификации. Операция идемпотентна: на свежей базе
/// и на уже обновлённой она ничего не делает.
/// </summary>
public static class DatabaseBootstrap
{
    public static void Apply(AppDbContext db)
    {
        var migrations = db.Database.GetMigrations().ToList();
        if (migrations.Count == 0)
        {
            db.Database.EnsureCreated();
            if (TableExists(db, "Listings")) UpgradeLegacySchema(db);
            return;
        }

        if (TableExists(db, "Listings") && !TableExists(db, "__EFMigrationsHistory"))
        {
            UpgradeLegacySchema(db);

            db.Database.ExecuteSqlRaw(
                "CREATE TABLE \"__EFMigrationsHistory\" (" +
                "\"MigrationId\" TEXT NOT NULL CONSTRAINT \"PK___EFMigrationsHistory\" PRIMARY KEY, " +
                "\"ProductVersion\" TEXT NOT NULL);");

            var version = "10.0.0";
            foreach (var id in migrations)
                db.Database.ExecuteSql(
                    $"INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({id}, {version});");
        }

        db.Database.Migrate();
    }

    private static void UpgradeLegacySchema(AppDbContext db)
    {
        if (!TableExists(db, "Users"))
        {
            db.Database.ExecuteSqlRaw(
                "CREATE TABLE \"Users\" (" +
                "\"Id\" INTEGER NOT NULL CONSTRAINT \"PK_Users\" PRIMARY KEY AUTOINCREMENT, " +
                "\"Email\" TEXT NOT NULL, " +
                "\"PasswordHash\" TEXT NOT NULL, " +
                "\"CreatedAt\" TEXT NOT NULL);");
        }
        db.Database.ExecuteSqlRaw("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_Users_Email\" ON \"Users\" (\"Email\");");

        if (!ColumnExists(db, "Listings", "OwnerId"))
        {
            db.Database.ExecuteSqlRaw(
                "ALTER TABLE \"Listings\" ADD COLUMN \"OwnerId\" INTEGER NULL " +
                "REFERENCES \"Users\" (\"Id\") ON DELETE SET NULL;");
        }
        db.Database.ExecuteSqlRaw("CREATE INDEX IF NOT EXISTS \"IX_Listings_OwnerId\" ON \"Listings\" (\"OwnerId\");");
    }

    private static bool TableExists(AppDbContext db, string name) =>
        Count(db, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $a", name) > 0;

    private static bool ColumnExists(AppDbContext db, string table, string column) =>
        Count(db, "SELECT COUNT(*) FROM pragma_table_info($a) WHERE name = $b", table, column) > 0;

    // Параметры называются $a, $b — по порядку
    private static int Count(AppDbContext db, string sql, params string[] args)
    {
        var conn = db.Database.GetDbConnection();
        var wasClosed = conn.State != ConnectionState.Open;
        if (wasClosed) conn.Open();
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            for (var i = 0; i < args.Length; i++)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = "$" + (char)('a' + i);
                p.Value = args[i];
                cmd.Parameters.Add(p);
            }
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
        finally
        {
            if (wasClosed) conn.Close();
        }
    }
}
