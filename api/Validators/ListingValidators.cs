using FluentValidation;
using ListingsApi.Contracts;
using ListingsApi.Data;
using Microsoft.EntityFrameworkCore;

namespace ListingsApi.Validators;

// Правила пишем один раз в базовом классе, наследники — по строке.
// Тексты сообщений совпадают с проверками формы на клиенте (listing-form-page.ts).
public abstract class ListingFieldsValidator<T> : AbstractValidator<T> where T : IListingFields
{
    protected ListingFieldsValidator(AppDbContext db)
    {
        RuleFor(x => x.Title)
            .Cascade(CascadeMode.Stop)                                    // одна ошибка на поле
            .NotEmpty().WithMessage("Укажите заголовок")                  // и "", и "   "
            .MinimumLength(5).WithMessage("Не короче 5 символов")
            .MaximumLength(200).WithMessage("Не длиннее 200 символов");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Цена больше 0")
            .LessThanOrEqualTo(1_000_000_000).WithMessage("Слишком большая цена");

        RuleFor(x => x.Rooms)
            .InclusiveBetween(1, 10).WithMessage("Комнат — от 1 до 10");

        RuleFor(x => x.Address)
            .MaximumLength(300).WithMessage("Не длиннее 300 символов");

        // проверка по базе: асинхронное правило
        RuleFor(x => x.DistrictId)
            .MustAsync((id, ct) => db.Districts.AnyAsync(d => d.Id == id, ct))
            .WithMessage("Район не найден");
    }
}

public class CreateListingRequestValidator(AppDbContext db)
    : ListingFieldsValidator<CreateListingRequest>(db);

public class UpdateListingRequestValidator(AppDbContext db)
    : ListingFieldsValidator<UpdateListingRequest>(db);
