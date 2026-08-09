import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'cf-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 class="text-2xl font-semibold">Iniciar sesión</h1>

      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="flex flex-col gap-1">
          <span class="text-sm">Email</span>
          <input
            type="email"
            formControlName="email"
            class="cf-focus-ring rounded-md border px-3 py-2"
            autocomplete="email"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm">Contraseña</span>
          <input
            type="password"
            formControlName="password"
            class="cf-focus-ring rounded-md border px-3 py-2"
            autocomplete="current-password"
          />
        </label>

        @if (error(); as message) {
          <p class="text-sm text-red-600" role="alert">{{ message }}</p>
        }

        <button
          type="submit"
          class="cf-focus-ring rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          [disabled]="form.invalid || loading()"
        >
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p class="text-sm">
        ¿No tienes cuenta?
        <a routerLink="/auth/register" class="cf-focus-ring underline">Regístrate</a>
      </p>
    </main>
  `,
})
export default class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup<LoginForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.loading.set(false);
        this.error.set('Email o contraseña incorrectos.');
      },
    });
  }
}
