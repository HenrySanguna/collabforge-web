import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BoardsService } from '../../core/boards/boards.service';
import type { BoardDetailDto } from '../../core/boards/models/board.models';

@Component({
  selector: 'cf-board-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="p-8 text-sm text-neutral-500">Cargando tablero…</p>
    } @else if (board(); as b) {
      <main class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
        <header class="flex items-center justify-between">
          <div>
            <a routerLink="/dashboard" class="cf-focus-ring text-sm underline">← Mis tableros</a>
            <h1 class="text-2xl font-semibold">{{ b.title }}</h1>
            <p class="text-sm text-neutral-500">Fase: {{ b.phase }}</p>
          </div>

          @if (b.myRole === 'owner') {
            <div class="flex flex-col items-end gap-2">
              <button
                type="button"
                class="cf-focus-ring rounded-md border px-4 py-2 text-sm"
                (click)="generateInvite()"
              >
                Generar enlace de invitación
              </button>
              @if (inviteLink(); as link) {
                <code class="max-w-xs truncate text-xs text-neutral-500">{{ link }}</code>
              }
            </div>
          }
        </header>

        <div class="grid gap-4 sm:grid-cols-3">
          @for (column of b.columns; track column.id) {
            <section
              class="rounded-lg border p-4"
              [style.background]="column.color"
              [attr.aria-label]="column.title"
            >
              <h2 class="font-semibold">{{ column.title }}</h2>
              <p class="mt-2 text-xs text-neutral-600">Sin notas todavía.</p>
            </section>
          }
        </div>
      </main>
    } @else {
      <p class="p-8 text-sm text-red-600">No se pudo cargar el tablero.</p>
    }
  `,
})
export default class BoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly boardsService = inject(BoardsService);

  readonly board = signal<BoardDetailDto | null>(null);
  readonly loading = signal(true);
  readonly inviteLink = signal<string | null>(null);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.boardsService.bySlug(slug).subscribe({
      next: (board) => {
        this.board.set(board);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  generateInvite(): void {
    const board = this.board();
    if (!board) return;

    this.boardsService.createInvite(board.id).subscribe((invite) => {
      this.inviteLink.set(`${location.origin}/invite/${invite.token}`);
    });
  }
}
