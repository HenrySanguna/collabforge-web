import { Injectable, computed, signal } from '@angular/core';
import type { BoardSnapshot, NoteDto, ParticipantDto } from '@collabforge/contracts';
import type { BoardDetailDto } from './models/board.models';

export interface OptimisticNote extends NoteDto {
  pending?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly _snapshot = signal<BoardSnapshot | null>(null);
  private readonly _notes = signal<Record<string, OptimisticNote>>({});
  private readonly _participants = signal<ParticipantDto[]>([]);

  readonly snapshot = this._snapshot.asReadonly();
  readonly board = computed(() => this._snapshot()?.board ?? null);
  readonly columns = computed(() => this._snapshot()?.columns ?? []);
  readonly myRole = computed(() => this._snapshot()?.myRole ?? null);
  readonly notes = computed(() => Object.values(this._notes()));
  readonly participants = this._participants.asReadonly();

  readonly notesByColumn = computed(() => {
    const grouped: Partial<Record<string, OptimisticNote[]>> = {};
    for (const note of this.notes()) {
      (grouped[note.columnId] ??= []).push(note);
    }
    for (const list of Object.values(grouped)) {
      list?.sort((a, b) => a.position - b.position);
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
  }

  applySnapshot(snapshot: BoardSnapshot): void {
    this._snapshot.set(snapshot);
    this._participants.set(snapshot.participants);
    const byId: Record<string, OptimisticNote> = {};
    for (const note of snapshot.notes) byId[note.id] = note;
    this._notes.set(byId);
  }

  setParticipants(participants: ParticipantDto[]): void {
    this._participants.set(participants);
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
  }
}
