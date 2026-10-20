import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { District, Listing, ListingRequest } from '../models/listing';
import { ListingApi } from '../services/listing-api';
import { AdminApi } from './admin-api';
import { problemErrors } from '../utils/problem-details';

const KEY_STORAGE = 'listings-admin-key';

// Поля формы храним строками — так проще работать с <input>
interface Draft {
  id: number | null;      // null = новое объявление
  title: string;
  price: string;
  rooms: string;
  districtId: string;
  address: string;
}

const emptyDraft = (): Draft => ({ id: null, title: '', price: '', rooms: '2', districtId: '', address: '' });

@Component({
  selector: 'app-admin',
  imports: [DecimalPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private reader = inject(ListingApi);     // чтение — открыто всем
  private api = inject(AdminApi);          // запись — с ключом администратора
  private router = inject(Router);

  key = signal(readKey());
  authorized = signal(false);
  checking = signal(false);

  listings = signal<Listing[]>([]);
  districts = signal<District[]>([]);

  draft = signal<Draft | null>(null);       // null = форма скрыта
  newDistrict = signal('');

  message = signal<string | null>(null);    // успех
  error = signal<string | null>(null);      // ошибка
  busy = signal(false);

  constructor() {
    if (this.key()) this.login();           // ключ запомнен в этой вкладке
  }

  back() {
    this.router.navigateByUrl('/');
  }

  // ---------- вход ----------
  onKey(event: Event) {
    this.key.set((event.target as HTMLInputElement).value);
  }

  login() {
    this.checking.set(true);
    this.error.set(null);
    this.api.ping(this.key()).subscribe({
      next: () => {
        this.authorized.set(true);
        this.checking.set(false);
        saveKey(this.key());
        this.reload();
      },
      error: err => {
        this.checking.set(false);
        this.authorized.set(false);
        this.error.set(describe(err));
      },
    });
  }

  logout() {
    saveKey('');
    this.key.set('');
    this.authorized.set(false);
    this.draft.set(null);
  }

  reload() {
    this.reader.getAll().subscribe({
      next: data => this.listings.set(data),
      error: err => this.error.set(describe(err)),
    });
    this.reader.getDistricts().subscribe({
      next: data => this.districts.set(data),
      error: err => this.error.set(describe(err)),
    });
  }

  // ---------- объявления ----------
  startNew() {
    const first = this.districts()[0];
    this.draft.set({ ...emptyDraft(), districtId: first ? String(first.id) : '' });
    this.clearMessages();
  }

  startEdit(l: Listing) {
    this.draft.set({
      id: l.id,
      title: l.title,
      price: String(l.price),
      rooms: String(l.rooms),
      districtId: String(l.districtId),
      address: l.address ?? '',
    });
    this.clearMessages();
  }

  cancel() {
    this.draft.set(null);
  }

  setField(field: keyof Draft, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draft.update(d => (d ? { ...d, [field]: value } : d));
  }

  save() {
    const d = this.draft();
    if (!d) return;

    const price = Number(d.price);
    const rooms = Number(d.rooms);
    const districtId = Number(d.districtId);

    if (d.title.trim().length < 5) return this.error.set('Название — не короче 5 символов');
    if (!(price > 0)) return this.error.set('Цена должна быть больше 0');
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 10) return this.error.set('Комнат — от 1 до 10');
    if (!districtId) return this.error.set('Выберите район');

    const body: ListingRequest = {
      title: d.title.trim(),
      price,
      rooms,
      districtId,
      address: d.address.trim() || null,
    };

    const isNew = d.id === null;
    const request: Observable<unknown> = isNew
      ? this.api.createListing(this.key(), body)
      : this.api.updateListing(this.key(), d.id!, body);

    this.run(request, isNew ? 'Объявление добавлено' : 'Изменения сохранены', () => this.draft.set(null));
  }

  remove(l: Listing) {
    if (!confirm(`Удалить объявление «${l.title}»?`)) return;
    this.run(this.api.deleteListing(this.key(), l.id), 'Объявление удалено');
  }

  // ---------- районы ----------
  onNewDistrict(event: Event) {
    this.newDistrict.set((event.target as HTMLInputElement).value);
  }

  addDistrict() {
    const name = this.newDistrict().trim();
    if (!name) return this.error.set('Введите название района');
    this.run(this.api.createDistrict(this.key(), name), 'Район добавлен', () => this.newDistrict.set(''));
  }

  renameDistrict(d: District) {
    const name = prompt('Новое название района', d.name)?.trim();
    if (!name || name === d.name) return;
    this.run(this.api.updateDistrict(this.key(), d.id, name), 'Район переименован');
  }

  removeDistrict(d: District) {
    if (!confirm(`Удалить район «${d.name}»?`)) return;
    this.run(this.api.deleteDistrict(this.key(), d.id), 'Район удалён');
  }

  // ---------- общее ----------
  private run(request: Observable<unknown>, success: string, after?: () => void) {
    this.clearMessages();
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.message.set(success);
        after?.();
        this.reload();
      },
      error: err => {
        this.busy.set(false);
        this.error.set(describe(err));
      },
    });
  }

  private clearMessages() {
    this.message.set(null);
    this.error.set(null);
  }
}

function describe(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Нет доступа: проверьте ключ администратора (на сервере должен быть задан Admin__ApiKey)';
    if (err.status === 0) return 'Сервер недоступен';
    const fields = problemErrors(err);                                  // 400 от валидаторов (ProblemDetails)
    if (fields) return Object.values(fields).flat().join('. ');
    if (typeof err.error === 'string' && err.error) return err.error;   // BadRequest/Conflict с текстом (районы)
    if (err.status === 403) return 'Недостаточно прав';
    if (err.status === 404) return 'Не найдено (возможно, уже удалено)';
  }
  return 'Не удалось выполнить запрос';
}

// Ключ живёт только в sessionStorage (до закрытия вкладки), на диск и в код не попадает
function readKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}
function saveKey(value: string) {
  try {
    if (value) sessionStorage.setItem(KEY_STORAGE, value);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch { /* хранилище недоступно — не страшно */ }
}
