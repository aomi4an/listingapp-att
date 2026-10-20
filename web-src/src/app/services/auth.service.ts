import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, Credentials, JwtPayload } from '../models/auth';

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/api/auth`;

  private token = signal<string | null>(readToken());

  // только для интерфейса — подпись проверяет сервер
  user = computed(() => decodePayload(this.token()));
  isLoggedIn = computed(() => {
    const u = this.user();
    return !!u && u.exp * 1000 > Date.now();
  });
  userId = computed(() => (this.user() ? Number(this.user()!.sub) : null));

  getToken(): string | null {
    return this.isLoggedIn() ? this.token() : null;
  }

  async login(c: Credentials) {
    const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.base}/login`, c));
    this.save(res.token);
  }

  async register(c: Credentials) {
    const res = await firstValueFrom(this.http.post<AuthResponse>(`${this.base}/register`, c));
    this.save(res.token);
  }

  logout() {
    writeToken(null);
    this.token.set(null);
    this.router.navigate(['/']);
  }

  private save(token: string) {
    writeToken(token);
    this.token.set(token);
  }
}

function decodePayload(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)) as JwtPayload;
  } catch {
    return null;
  }
}

// localStorage может быть недоступен (приватный режим, запрет) — тогда вход живёт до перезагрузки
function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* не страшно */ }
}
