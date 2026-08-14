import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { BoardPhase } from '@collabforge/contracts';
import { BoardsService } from '../../core/boards/boards.service';
import { BoardStore } from '../../core/boards/board.store';
import { BoardRealtimeFacade } from '../../core/boards/board-realtime.facade';
import { AuthStore } from '../../core/auth/auth.store';
import { BoardColumnComponent } from './components/board-column.component';
import { ConnectionBannerComponent } from '../../shared/ui/connection-banner.component';
import { PresenceBarComponent } from '../../shared/ui/presence-bar.component';
import { CursorLayerComponent } from '../../shared/ui/cursor-layer.component';
import { SessionTimerComponent } from '../../shared/ui/session-timer.component';
import { PhaseControlsComponent } from '../../shared/ui/phase-controls.component';
import { VoteBudgetComponent } from '../../shared/ui/vote-budget.component';
import type { BoardDetailDto } from '../../core/boards/models/board.models';

@Component({
  selector: 'cf-board-page',
  standalone: true,
  imports: [
    RouterLink,
    BoardColumnComponent,
    ConnectionBannerComponent,
    PresenceBarComponent,
    CursorLayerComponent,
    SessionTimerComponent,
    PhaseControlsComponent,
    VoteBudgetComponent,
  ],
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
            <p class="text-sm text-neutral-500">Fase: {{ phase() }}</p>
            <cf-connection-banner [state]="realtime.connectionState()" />
            <cf-session-timer
              [endsAt]="store.timerEndsAt()"
              [serverTime]="store.serverTime()"
              [paused]="store.timerPaused()"
            />
          </div>

          <div class="flex flex-col items-end gap-2">
            <cf-presence-bar
              [participants]="store.participants()"
              [selfUserId]="auth.user()?.id ?? null"
            />

            @if (phase() === 'VOTING') {
              <cf-vote-budget [budget]="store.voteBudget()" [spent]="votesSpent()" />
            }

            @if (b.myRole === 'owner') {
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
            }
          </div>
        </header>

        <cf-phase-controls
          [phase]="phase()"
          [isOwner]="b.myRole === 'owner'"
          (phaseChange)="changePhase($event)"
          (startTimer)="startTimer($event)"
          (pauseTimer)="pauseTimer()"
          (cancelTimer)="cancelTimer()"
          (reveal)="reveal()"
        />

        <div class="relative grid gap-4 sm:grid-cols-3">
          @for (column of store.columns(); track column.id) {
            <cf-board-column
              [column]="column"
              [notes]="store.notesByColumn()[column.id] ?? []"
              [canCreate]="phase() === 'COLLECTING'"
              [myUserId]="auth.user()?.id ?? null"
              [myRole]="b.myRole"
              [phase]="phase()"
              [voteTally]="store.tally()"
              [myVotes]="store.myVotes()"
              [canVote]="canVote()"
              (noteCreated)="createNote(column.id, $event)"
              (deleteRequested)="deleteNote($event)"
              (voteCast)="castVote($event)"
              (voteRetracted)="retractVote($event)"
            />
          }

          <cf-cursor-layer
            [cursors]="realtime.cursors()"
            [participants]="store.participants()"
            [selfUserId]="auth.user()?.id ?? null"
            (cursorMove)="realtime.sendCursor($event.x, $event.y)"
          />
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
  protected readonly realtime = inject(BoardRealtimeFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(BoardStore);
  protected readonly auth = inject(AuthStore);

  readonly board = signal<BoardDetailDto | null>(null);
  readonly loading = signal(true);
  readonly inviteLink = signal<string | null>(null);

  protected readonly phase = computed<BoardPhase>(() => this.store.phase() ?? 'COLLECTING');
  protected readonly votesSpent = computed(() =>
    Object.values(this.store.myVotes()).reduce((sum, count) => sum + count, 0),
  );
  protected readonly canVote = computed(
    () => this.phase() === 'VOTING' && this.votesSpent() < this.store.voteBudget(),
  );

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

    effect(() => {
      if (this.realtime.kicked()) {
        void this.router.navigate(['/dashboard'], { queryParams: { removed: 'true' } });
      }
    });
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

  castVote(noteId: string): void {
    void this.realtime.castVote(noteId);
  }

  retractVote(noteId: string): void {
    void this.realtime.retractVote(noteId);
  }

  changePhase(phase: BoardPhase): void {
    void this.realtime.changePhase(phase);
  }

  startTimer(durationSeconds: number): void {
    void this.realtime.startTimer(durationSeconds);
  }

  pauseTimer(): void {
    void this.realtime.pauseTimer();
  }

  cancelTimer(): void {
    void this.realtime.cancelTimer();
  }

  reveal(): void {
    void this.realtime.reveal();
  }
}
