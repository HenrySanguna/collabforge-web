import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { BoardsService } from '../../core/boards/boards.service';

@Component({
  selector: 'cf-accept-invite-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4 text-center"
    >
      @if (error(); as message) {
        <p class="text-sm text-danger" role="alert">{{ message }}</p>
      } @else {
        <p class="text-sm text-foreground-muted">Uniéndote al tablero…</p>
      }
    </main>
  `,
})
export default class AcceptInvitePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(AuthStore);
  private readonly boardsService = inject(BoardsService);

  readonly error = signal<string | null>(null);

  constructor() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error.set('Enlace de invitación inválido.');
      return;
    }

    if (!this.store.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/invite/${token}` },
      });
      return;
    }

    this.boardsService.acceptInvite(token).subscribe({
      next: (board) => this.router.navigate(['/board', board.slug]),
      error: () => this.error.set('El enlace de invitación no es válido o ha expirado.'),
    });
  }
}
