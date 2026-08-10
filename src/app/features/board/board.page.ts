import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BoardsService } from '../../core/boards/boards.service';
import { BoardStore } from '../../core/boards/board.store';
import { BoardRealtimeFacade } from '../../core/boards/board-realtime.facade';
import { AuthStore } from '../../core/auth/auth.store';
import { BoardColumnComponent } from './components/board-column.component';
import type { BoardDetailDto } from '../../core/boards/models/board.models';

@Component({
  selector: 'cf-board-page',
  standalone: true,
  imports: [RouterLink, BoardColumnComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <p class="p-8 text-sm text-neutral-500">Cargando tablero…</p>
    } @else if (board(); as b) {
      <main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <header class="flex items-center justify-between">
          <div>
            <a routerLink="/dashboard" class="cf-focus-ring text-sm underline">← Mis tableros</a>
            <h1 class="text-2xl font-semibold">{{ b.title }}</h1>
            <p class="text-sm text-neutral-500">
              Fase: {{ store.board()?.phase ?? b.phase }} · {{ connectionLabel() }}
            </p>
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
          @for (column of store.columns(); track column.id) {
            <cf-board-column
              [column]="column"
              [notes]="store.notesByColumn()[column.id] ?? []"
              [canCreate]="b.phase === 'COLLECTING'"
              [myUserId]="auth.user()?.id ?? null"
              [myRole]="b.myRole"
              (noteCreated)="createNote(column.id, $event)"
              (deleteRequested)="deleteNote($event)"
            />
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
  private readonly realtime = inject(BoardRealtimeFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(BoardStore);
  protected readonly auth = inject(AuthStore);

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
        this.store.seedFromRest(board);
        this.realtime.connect(board.id);
      },
      error: () => this.loading.set(false),
    });

    this.destroyRef.onDestroy(() => this.realtime.disconnect());
  }

  connectionLabel(): string {
    switch (this.realtime.connectionState()) {
      case 'connected':
        return 'En vivo';
      case 'connecting':
        return 'Conectando…';
      case 'reconnecting':
        return 'Reconectando…';
      default:
        return 'Sin conexión';
    }
  }

  generateInvite(): void {
    const board = this.board();
    if (!board) return;

    this.boardsService.createInvite(board.id).subscribe((invite) => {
      this.inviteLink.set(`${location.origin}/invite/${invite.token}`);
    });
  }

  createNote(columnId: string, text: string): void {
    void this.realtime.createNote(columnId, text);
  }

  deleteNote(noteId: string): void {
    void this.realtime.deleteNote(noteId);
  }
}
