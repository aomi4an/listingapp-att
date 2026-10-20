using FluentValidation;
using ListingsApi.Contracts;
using ListingsApi.Data;
using ListingsApi.Services;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator(AppDbContext db)
    {
        RuleFor(x => x.Email)
            .Cascade(CascadeMode.Stop)                                    // не идём в базу с пустым email
            .NotEmpty().WithMessage("Укажите email")
            .EmailAddress().WithMessage("Неверный формат email")
            .MaximumLength(256).WithMessage("Не длиннее 256 символов")
            .MustAsync(async (email, ct) =>
            {
                var normalized = AuthService.Normalize(email);
                return !await db.Users.AnyAsync(u => u.Email == normalized, ct);
            })
            .WithMessage("Этот email уже зарегистрирован");

        RuleFor(x => x.Password).ApplyPasswordRules();
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Укажите текущий пароль");
        RuleFor(x => x.NewPassword).ApplyPasswordRules();
    }
}

internal static class PasswordRules
{
    // Общие правила нового пароля: регистрация и смена пароля
    public static IRuleBuilderOptions<T, string> ApplyPasswordRules<T>(this IRuleBuilder<T, string> rule) =>
        rule.Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Укажите пароль")
            .MinimumLength(8).WithMessage("Пароль — от 8 символов")
            .Matches("[0-9]").WithMessage("Нужна хотя бы одна цифра");
}
