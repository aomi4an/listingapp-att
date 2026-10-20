import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  form, FormField, required, min, max, minLength, maxLength, submit, FieldTree, ValidationError,
} from '@angular/forms/signals';
import { District, Listing, ListingRequest } from '../../models/listing';
import { ListingApi } from '../../services/listing-api';
import { ErrorMessagePipe, errorMessage } from '../../pipes/error-message.pipe';
import { problemErrors } from '../../utils/problem-details';
import { HasUnsavedChanges } from '../../guards/unsaved.guard';

interface ListingFormModel {
  title: string;
  price: number;
  rooms: number;
  districtId: string;     // select отдаёт строку
  address: string;        // '' вместо null
}

const EMPTY: ListingFormModel = { title: '', price: 0, rooms: 1, districtId: '', address: '' };

const TITLE_MAX = 200;

@Component({
  selector: 'app-listing-form-page',
  imports: [FormField, RouterLink, ErrorMessagePipe],
  templateUrl: './listing-form-page.html',
  styleUrl: './listing-form-page.css',
})
export class ListingFormPage implements HasUnsavedChanges {
  private api = inject(ListingApi);
  private router = inject(Router);

  // --- режим: создание (/listings/new) или редактирование (/listings/:id/edit) ---
  id = input<string>();                          // только на /listings/:id/edit
  isEdit = computed(() => !!this.id());

  // функция вернула undefined → запроса нет (на /listings/new)
  listing = httpResource<Listing>(() =>
    this.id() ? this.api.listingUrl(this.id()!) : undefined);

  districts = httpResource<District[]>(() => this.api.districtsUrl, { defaultValue: [] });
  districtList = computed<District[]>(() => (this.districts.hasValue() ? (this.districts.value() ?? []) : []));

  // --- форма ---
  model = signal<ListingFormModel>(EMPTY);

  // те же правила и тексты, что в ListingFieldsValidator на сервере
  listingForm = form(this.model, (s) => {
    required(s.title, { message: 'Укажите заголовок' });
    minLength(s.title, 5, { message: 'Не короче 5 символов' });
    maxLength(s.title, TITLE_MAX, { message: 'Не длиннее 200 символов' });
    min(s.price, 1, { message: 'Цена больше 0' });
    min(s.rooms, 1, { message: 'Комнат — от 1 до 10' });
    max(s.rooms, 10, { message: 'Комнат — от 1 до 10' });
    required(s.districtId, { message: 'Выберите район' });
    maxLength(s.address, 300, { message: 'Не длиннее 300 символов' });
  });

  // счётчик символов под заголовком (задание ★)
  titleLength = computed(() => this.model().title.length);
  titleMax = TITLE_MAX;

  generalError = signal<string | null>(null);   // сеть, 404, 500 — не про конкретное поле

  private saved = false;                        // после успешного сохранения не спрашиваем «уйти без сохранения?»

  constructor() {
    // объявление пришло → переносим в модель формы (DTO → модель)
    effect(() => {
      const l = this.listing.hasValue() ? this.listing.value() : undefined;
      if (l) {
        this.model.set({
          title: l.title,
          price: l.price,
          rooms: l.rooms,
          districtId: String(l.districtId),
          address: l.address ?? '',
        });
      }
    });
  }

  // для unsavedGuard: есть ли изменения, которые пользователь ещё не сохранил
  canLeave(): boolean {
    if (this.saved || !this.listingForm().dirty()) return true;
    return confirm('Уйти без сохранения?');
  }

  async save(event: Event) {
    event.preventDefault();
    // submit: отмечает все поля touched; если форма невалидна — action не вызывается
    await submit(this.listingForm, async () => {
      this.generalError.set(null);
      try {
        const id = await this.persist(this.toRequest());
        this.saved = true;
        this.router.navigate(['/listings', id]);
        return undefined;                              // успех
      } catch (e) {
        const errors = problemErrors(e);
        if (errors) return this.toFormErrors(errors);  // 400 → под поля
        this.generalError.set(errorMessage(e));
        return undefined;
      }
    });
  }

  private toRequest(): ListingRequest {
    const v = this.model();
    return {
      title: v.title.trim(),
      price: v.price,
      rooms: v.rooms,
      districtId: Number(v.districtId),
      address: v.address.trim() || null,
    };
  }

  private async persist(r: ListingRequest): Promise<number> {
    if (this.isEdit()) {
      const id = Number(this.id());
      await firstValueFrom(this.api.update(id, r));   // 204 — тела нет, id свой
      return id;
    }
    const created = await firstValueFrom(this.api.create(r));
    return created.id;                                 // 201 — новый id из ответа
  }

  // ключ из ProblemDetails → поле формы; неизвестный ключ → ошибка всей формы
  private toFormErrors(errors: Record<string, string[]>): ValidationError.WithOptionalFieldTree[] {
    const f = this.listingForm;
    const fields: Record<string, FieldTree<unknown>> = {
      title: f.title, price: f.price, rooms: f.rooms, districtId: f.districtId, address: f.address,
    };
    return Object.entries(errors).flatMap(([key, messages]) =>
      messages.map((message) => ({ kind: 'server', message, fieldTree: fields[key] })),
    );
  }
}
