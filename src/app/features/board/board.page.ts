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
import {
  ActionItemsPanelComponent,
  type ActionItemCreateRequest,
  type ActionItemStatusToggleRequest,
} from './components/action-items-panel.component';
import { toMarkdown } from '../../core/boards/board-export.util';
import { downloadMarkdown } from '../../core/util/download.util';
import { AsyncStateComponent } from '../../shared/ui/async-state.component';
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
    ActionItemsPanelComponent,
    AsyncStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <cf-async-state state="loading" message="Cargando tablero…" />
    } @else if (board(); as b) {
      <main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a routerLink="/dashboard" class="cf-focus-ring text-sm underline">← Mis tableros</a>
            <h1 class="text-2xl font-semibold">{{ b.title }}</h1>
            <p class="text-sm text-foreground-muted" aria-live="polite">Fase: {{ phase() }}</p>
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

        @defer (when phase() === 'DISCUSSING') {
          <cf-action-items-panel
            [actionItems]="store.actionItems()"
            [participants]="store.participants()"
            [isOwner]="b.myRole === 'owner'"
            [phase]="phase()"
            (itemCreated)="createActionItem($event)"
            (itemStatusToggled)="updateActionItemStatus($event)"
            (itemDeleted)="deleteActionItem($event)"
          />
          <button
            type="button"
            class="cf-focus-ring self-start rounded-md border px-4 py-2 text-sm"
            (click)="exportMarkdown()"
          >
            Exportar a Markdown
          </button>
        } @placeholder {
          <span></span>
        }

        <div class="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      <cf-async-state
        state="error"
        message="No se pudo cargar el tablero."
        retryLabel="Reintentar"
        (retry)="retryLoad()"
      />
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

  private slug: string | null = null;

  constructor() {
    this.slug = this.route.snapshot.paramMap.get('slug');
    if (!this.slug) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    this.loadBoard(this.slug);

    this.destroyRef.onDestroy(() => this.realtime.disconnect());

    effect(() => {
      if (this.realtime.kicked()) {
        void this.router.navigate(['/dashboard'], { queryParams: { removed: 'true' } });
      }
    });
  }

  private loadBoard(slug: string): void {
    this.loading.set(true);
    this.boardsService.bySlug(slug).subscribe({
      next: (board) => {
        this.board.set(board);
        this.loading.set(false);
        this.store.seedFromRest(board);
        this.realtime.connect(board.id);
      },
      error: () => this.loading.set(false),
    });
  }

  retryLoad(): void {
    if (!this.slug) return;
    this.loadBoard(this.slug);
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

  createActionItem(request: ActionItemCreateRequest): void {
    void this.realtime.createActionItem(request.text, request.assigneeId);
  }

  updateActionItemStatus(request: ActionItemStatusToggleRequest): void {
    void this.realtime.updateActionItem({ id: request.id, status: request.status });
  }

  deleteActionItem(id: string): void {
    void this.realtime.deleteActionItem(id);
  }

  exportMarkdown(): void {
    const board = this.board();
    if (!board) return;

    const markdown = toMarkdown({
      title: board.title,
      slug: board.slug,
      revealed: this.store.revealed(),
      columns: this.store.columns(),
      notes: this.store.notes(),
      tally: this.store.tally(),
      actionItems: this.store.actionItems(),
      participants: this.store.participants(),
    });

    downloadMarkdown(board.slug, markdown);
  }
}
