import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

// Видит каждый запрос и ответ. Здесь — только лог ошибок; токен добавляет auth.interceptor.
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    tap({ error: (err) => console.error(`[API] ${req.method} ${req.url} → ${err.status}`) })
  );
