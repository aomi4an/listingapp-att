import { HttpErrorResponse } from '@angular/common/http';

// { title: ['Укажите заголовок'], rooms: [...] } — или null, если это не ошибка валидации
export function problemErrors(e: unknown): Record<string, string[]> | null {
  if (e instanceof HttpErrorResponse && e.status === 400 && e.error?.errors) {
    return e.error.errors as Record<string, string[]>;
  }
  return null;
}
