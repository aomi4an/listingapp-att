import { Pipe, PipeTransform } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// Ошибка ресурса может прийти и самим HttpErrorResponse, и обёрнутой (поле cause)
function unwrap(err: unknown): unknown {
  if (err instanceof HttpErrorResponse) return err;
  const cause = (err as { cause?: unknown } | null | undefined)?.cause;
  return cause instanceof HttpErrorResponse ? cause : err;
}

/** HTTP-статус ошибки или null, если это не HTTP-ошибка. */
export function errorStatus(err: unknown): number | null {
  const e = unwrap(err);
  return e instanceof HttpErrorResponse ? e.status : null;
}

export function errorMessage(err: unknown): string {
  const e = unwrap(err);
  if (e instanceof HttpErrorResponse) {
    switch (e.status) {
      case 0:   return 'Сервер недоступен. Проверьте, что API запущен, и повторите.';
      case 400: return typeof e.error === 'string' ? e.error : 'Проверьте введённые данные.';
      case 401: return 'Войдите, чтобы продолжить.';
      case 403: return 'Это объявление может менять только автор.';
      case 404: return 'Объявление не найдено.';
      case 500: return 'Ошибка на сервере. Попробуйте позже.';
      default:  return `Ошибка ${e.status}.`;
    }
  }
  return 'Что-то пошло не так.';
}

@Pipe({ name: 'errorMessage' })
export class ErrorMessagePipe implements PipeTransform {
  transform(err: unknown): string { return errorMessage(err); }
}
