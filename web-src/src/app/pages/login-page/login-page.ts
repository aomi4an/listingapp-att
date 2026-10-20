import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required, email, submit } from '@angular/forms/signals';
import { AuthService } from '../../services/auth.service';
import { errorMessage } from '../../pipes/error-message.pipe';

@Component({
  selector: 'app-login-page',
  imports: [FormField, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  returnUrl = input<string>();               // ?returnUrl=/listings/new

  model = signal({ email: '', password: '' });
  loginForm = form(this.model, (s) => {
    required(s.email, { message: 'Укажите email' });
    email(s.email, { message: 'Неверный формат email' });
    required(s.password, { message: 'Укажите пароль' });
  });
  generalError = signal<string | null>(null);

  async save(event: Event) {
    event.preventDefault();
    await submit(this.loginForm, async () => {
      this.generalError.set(null);
      try {
        await this.auth.login(this.model());
        this.router.navigateByUrl(this.returnUrl() ?? '/');
      } catch (e) {
        this.generalError.set(
          e instanceof HttpErrorResponse && e.status === 401
            ? 'Неверный email или пароль'
            : errorMessage(e));
      }
      return undefined;
    });
  }
}
