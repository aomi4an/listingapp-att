import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required, email, minLength, submit, FieldTree } from '@angular/forms/signals';
import { AuthService } from '../../services/auth.service';
import { errorMessage } from '../../pipes/error-message.pipe';
import { problemErrors } from '../../utils/problem-details';

@Component({
  selector: 'app-register-page',
  imports: [FormField, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  model = signal({ email: '', password: '' });
  registerForm = form(this.model, (s) => {
    required(s.email, { message: 'Укажите email' });
    email(s.email, { message: 'Неверный формат email' });
    required(s.password, { message: 'Укажите пароль' });
    minLength(s.password, 8, { message: 'Пароль — от 8 символов' });
  });
  generalError = signal<string | null>(null);

  async save(event: Event) {
    event.preventDefault();
    await submit(this.registerForm, async () => {
      this.generalError.set(null);
      try {
        await this.auth.register(this.model());
        this.router.navigate(['/']);
        return undefined;
      } catch (e) {
        const errors = problemErrors(e);               // utils/problem-details.ts
        if (errors) {
          const fields: Record<string, FieldTree<unknown>> = {
            email: this.registerForm.email, password: this.registerForm.password,
          };
          return Object.entries(errors).flatMap(([key, messages]) =>
            messages.map((message) => ({ kind: 'server', message, fieldTree: fields[key] })));
        }
        this.generalError.set(errorMessage(e));
        return undefined;
      }
    });
  }
}
