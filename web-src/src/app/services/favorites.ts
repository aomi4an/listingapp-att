import { Injectable, signal } from '@angular/core';

const KEY = 'favorite_listings';

// Избранное (задание ★ урока 4). Сервис живёт всё время работы приложения, поэтому звёздочки
// одинаковы на всех страницах; список запоминается в браузере.
@Injectable({ providedIn: 'root' })
export class Favorites {
  private ids = signal<ReadonlySet<number>>(load());

  readonly all = this.ids.asReadonly();

  has(id: number): boolean {
    return this.ids().has(id);
  }

  // Новый Set, а не .add на старом: сигнал сравнивает значения по ссылке.
  // Если изменить тот же объект, ссылка не поменяется — computed и шаблон ничего не заметят.
  toggle(id: number) {
    const next = new Set(this.ids());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.ids.set(next);
    save(next);
  }
}

function load(): ReadonlySet<number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is number => typeof x === 'number') : []);
  } catch {
    return new Set();
  }
}

function save(ids: ReadonlySet<number>) {
  try { localStorage.setItem(KEY, JSON.stringify([...ids])); } catch { /* не страшно */ }
}
