import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AsyncStateComponent } from '../../shared/ui/async-state.component';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

interface RegisterForm {
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'cf-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AsyncStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 class="text-2xl font-semibold">Crear cuenta</h1>

      <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        <label class="flex flex-col gap-1">
          <span class="text-sm">Nombre</span>
          <input
            type="text"
            formControlName="name"
            class="cf-focus-ring appearance-none rounded-md border border-border px-3 py-2"
            autocomplete="name"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm">Email</span>
          <input
            type="email"
            formControlName="email"
            class="cf-focus-ring appearance-none rounded-md border border-border px-3 py-2"
            autocomplete="email"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-sm">Contraseña</span>
          <input
            type="password"
            formControlName="password"
            class="cf-focus-ring appearance-none rounded-md border border-border px-3 py-2"
            autocomplete="new-password"
            aria-describedby="password-hint"
          />
          <span id="password-hint" class="text-xs text-foreground-muted">
            Mínimo 10 caracteres, con mayúscula, minúscula y un dígito.
          </span>
        </label>

        @if (error(); as message) {
          <cf-async-state state="error" [message]="message" />
        }

        <button
          type="submit"
          class="cf-focus-ring rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          [disabled]="form.invalid || loading()"
        >
          {{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="text-sm">
        ¿Ya tienes cuenta?
        <a routerLink="/auth/login" class="cf-focus-ring underline">Inicia sesión</a>
      </p>
    </main>
  `,
})
export default class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup<RegisterForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
    }),
  });

  submit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl ?? '/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo completar el registro con estos datos.');
      },
    });
  }
}
