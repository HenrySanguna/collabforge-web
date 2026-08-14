import { Injectable, computed, signal } from '@angular/core';
import type { BoardPhase, BoardSnapshot, NoteDto, ParticipantDto } from '@collabforge/contracts';
import type { BoardDetailDto } from './models/board.models';

export interface OptimisticNote extends NoteDto {
  pending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly _snapshot = signal<BoardSnapshot | null>(null);
  private readonly _notes = signal<Record<string, OptimisticNote>>({});
  private readonly _participants = signal<ParticipantDto[]>([]);

  // phase/revealed y el timer llegan también en el snapshot completo, pero además tienen
  // eventos dedicados (session:phase-changed, session:timer-updated) que pueden actualizarlos
  // sin un board:sync completo, así que -igual que participants- viven en su propia señal.
  private readonly _phase = signal<BoardPhase | null>(null);
  private readonly _revealed = signal(false);
  private readonly _timerEndsAt = signal<string | null>(null);
  private readonly _timerPaused = signal(false);
  private readonly _timerRemainingMs = signal<number | undefined>(undefined);

  // myVotes/tally: idem, actualizados de forma independiente por vote:my-update / vote:tally.
  private readonly _myVotes = signal<Record<string, number>>({});
  private readonly _tally = signal<Record<string, number> | null>(null);

  readonly snapshot = this._snapshot.asReadonly();
  readonly board = computed(() => this._snapshot()?.board ?? null);
  readonly columns = computed(() => this._snapshot()?.columns ?? []);
  readonly myRole = computed(() => this._snapshot()?.myRole ?? null);
  readonly notes = computed(() => Object.values(this._notes()));
  readonly participants = this._participants.asReadonly();

  readonly phase = this._phase.asReadonly();
  readonly revealed = this._revealed.asReadonly();
  readonly timerEndsAt = this._timerEndsAt.asReadonly();
  readonly timerPaused = this._timerPaused.asReadonly();
  readonly timerRemainingMs = this._timerRemainingMs.asReadonly();
  readonly myVotes = this._myVotes.asReadonly();
  readonly tally = this._tally.asReadonly();

  // voteBudget/allowMultiVote/liveTally/serverTime no tienen evento dedicado propio:
  // siguen viviendo únicamente en el snapshot, así que son computed() puros sobre board().
  readonly voteBudget = computed(() => this.board()?.voteBudget ?? 0);
  readonly allowMultiVote = computed(() => this.board()?.allowMultiVote ?? false);
  readonly liveTally = computed(() => this.board()?.liveTally ?? false);
  readonly serverTime = computed(() => this._snapshot()?.serverTime ?? new Date().toISOString());

  readonly notesByColumn = computed(() => {
    const grouped: Partial<Record<string, OptimisticNote[]>> = {};
    for (const note of this.notes()) {
      (grouped[note.columnId] ??= []).push(note);
    }

    const discussing = this._phase() === 'DISCUSSING';
    const tally = this._tally();

    for (const list of Object.values(grouped)) {
      if (!list) continue;
      if (discussing) {
        list.sort((a, b) => {
          const votes = (tally?.[b.id] ?? 0) - (tally?.[a.id] ?? 0);
          return votes !== 0 ? votes : a.position - b.position;
        });
      } else {
        list.sort((a, b) => a.position - b.position);
      }
    }
    return grouped;
  });

  seedFromRest(board: BoardDetailDto): void {
    this._snapshot.set({
      board: {
        id: board.id,
        slug: board.slug,
        title: board.title,
        phase: board.phase,
        revealed: board.revealed,
        voteBudget: board.voteBudget,
        allowMultiVote: board.allowMultiVote,
        liveTally: board.liveTally,
        timerEndsAt: null,
        isArchived: board.isArchived,
        ownerId: board.ownerId,
      },
      columns: board.columns,
      notes: [],
      myVotes: {},
      tally: null,
      participants: [],
      actionItems: [],
      myRole: board.myRole,
      serverTime: new Date().toISOString(),
    });
    this._participants.set([]);
    this._phase.set(board.phase);
    this._revealed.set(board.revealed);
    this._timerEndsAt.set(null);
    this._timerPaused.set(false);
    this._timerRemainingMs.set(undefined);
    this._myVotes.set({});
    this._tally.set(null);
  }

  applySnapshot(snapshot: BoardSnapshot): void {
    this._snapshot.set(snapshot);
    this._participants.set(snapshot.participants);
    const byId: Record<string, OptimisticNote> = {};
    for (const note of snapshot.notes) byId[note.id] = note;
    this._notes.set(byId);

    this._phase.set(snapshot.board.phase);
    this._revealed.set(snapshot.board.revealed);
    this._timerEndsAt.set(snapshot.board.timerEndsAt);
    // El snapshot no trae timerPaused/timerRemainingMs (gap del backend: board-snapshot.service
    // solo serializa timerEndsAt); se asume no pausado hasta que llegue un session:timer-updated.
    this._timerPaused.set(false);
    this._timerRemainingMs.set(undefined);
    this._myVotes.set(snapshot.myVotes);
    this._tally.set(snapshot.tally);
  }

  setParticipants(participants: ParticipantDto[]): void {
    this._participants.set(participants);
  }

  setPhase(phase: BoardPhase, revealed: boolean): void {
    this._phase.set(phase);
    this._revealed.set(revealed);
  }

  setTimerState(endsAt: string | null, paused: boolean, remainingMs?: number): void {
    this._timerEndsAt.set(endsAt);
    this._timerPaused.set(paused);
    this._timerRemainingMs.set(remainingMs);
  }

  applyMyVoteUpdate(noteId: string, count: number): void {
    this._myVotes.update((votes) => ({ ...votes, [noteId]: count }));
  }

  applyTally(tally: Record<string, number>): void {
    this._tally.set(tally);
  }

  upsertNote(note: NoteDto): void {
    this._notes.update((notes) => ({ ...notes, [note.id]: note }));
  }

  addOptimisticNote(tempId: string, note: OptimisticNote): void {
    this._notes.update((notes) => ({ ...notes, [tempId]: { ...note, pending: true } }));
  }

  reconcileOptimisticNote(tempId: string, note: NoteDto): void {
    this._notes.update((notes) => {
      const next = { ...notes };
      delete next[tempId];
      next[note.id] = note;
      return next;
    });
  }

  removeNote(noteId: string): void {
    this._notes.update((notes) => {
      const next = { ...notes };
      delete next[noteId];
      return next;
    });
  }

  findNote(noteId: string): OptimisticNote | undefined {
    return this._notes()[noteId];
  }

  reset(): void {
    this._snapshot.set(null);
    this._notes.set({});
    this._participants.set([]);
    this._phase.set(null);
    this._revealed.set(false);
    this._timerEndsAt.set(null);
    this._timerPaused.set(false);
    this._timerRemainingMs.set(undefined);
    this._myVotes.set({});
    this._tally.set(null);
  }
}
