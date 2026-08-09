import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'cf-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 class="text-2xl font-semibold">Bienvenido, {{ store.user()?.name }}</h1>
      <button
        type="button"
        class="cf-focus-ring w-fit rounded-md border px-4 py-2"
        (click)="logout()"
      >
        Cerrar sesión
      </button>
    </main>
  `,
})
export default class DashboardPage {
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/auth/login'));
  }
}
