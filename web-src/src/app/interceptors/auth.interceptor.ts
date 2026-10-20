import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // токен — только нашему API
  const isOurApi = req.url.startsWith(`${environment.apiUrl}/api/`);
  if (!token || !isOurApi) return next(req);

  // 401 на этих запросах — не «токен протух», а неверный пароль / ключ администратора:
  // пользователя из-за них не выходим
  const own401 =
    req.headers.has('X-Admin-Key') ||
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/register');

  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authReq).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !own401) auth.logout();
      return throwError(() => err);
    }),
  );
};
