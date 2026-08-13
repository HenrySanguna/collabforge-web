import { Injectable, inject, signal } from '@angular/core';
import type {
  BoardSnapshot,
  CreateNoteAck,
  DeleteNoteAck,
  MoveNoteAck,
  NoteDto,
  NoteMovedPayload,
  UpdateNoteAck,
} from '@collabforge/contracts';
import { RealtimeService } from '../realtime/realtime.service';
import { BoardStore } from './board.store';
import { AuthStore } from '../auth/auth.store';

export interface CursorPosition {
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class BoardRealtimeFacade {
  private readonly realtime = inject(RealtimeService);
  private readonly store = inject(BoardStore);
  private readonly auth = inject(AuthStore);

  private readonly _cursors = signal<Record<string, CursorPosition>>({});

  readonly connectionState = this.realtime.state;
  readonly cursors = this._cursors.asReadonly();

  connect(boardId: string): void {
    const token = this.auth.accessToken();
    if (!token) throw new Error('No access token available.');

    const socket = this.realtime.connect(boardId, token);

    socket.on('board:sync', (snapshot: BoardSnapshot) => this.store.applySnapshot(snapshot));
    socket.on('note:created', (note: NoteDto) => this.store.upsertNote(note));
    socket.on('note:updated', (note: NoteDto) => this.store.upsertNote(note));
    socket.on('note:moved', (payload: NoteMovedPayload) => this.applyMove(payload));
    socket.on('note:deleted', ({ noteId }) => this.store.removeNote(noteId));
    socket.on('presence:updated', ({ participants }) => {
      this.store.setParticipants(participants);
      this.pruneCursors(new Set(participants.map((p) => p.userId)));
    });
    socket.on('cursor:moved', ({ userId, x, y }) => {
      this._cursors.update((cursors) => ({ ...cursors, [userId]: { x, y } }));
    });
  }

  disconnect(): void {
    this.realtime.disconnect();
    this.store.reset();
    this._cursors.set({});
  }

  sendCursor(x: number, y: number): void {
    this.realtime.emitVolatile('cursor:move', { x, y });
  }

  private pruneCursors(activeUserIds: Set<string>): void {
    this._cursors.update((cursors) => {
      const next: Record<string, CursorPosition> = {};
      for (const [userId, position] of Object.entries(cursors)) {
        if (activeUserIds.has(userId)) next[userId] = position;
      }
      return next;
    });
  }

  async createNote(columnId: string, text: string): Promise<void> {
    const tempId = crypto.randomUUID();
    this.store.addOptimisticNote(tempId, {
      id: tempId,
      columnId,
      text,
      position: Number.MAX_SAFE_INTEGER,
      groupId: null,
      version: 0,
      isDiscussed: false,
      author: null,
      createdAt: new Date().toISOString(),
    });

    try {
      const ack = await this.realtime.emitWithAck<'note:create', CreateNoteAck>('note:create', {
        columnId,
        text,
        tempId,
      });
      if (ack.ok) {
        this.store.reconcileOptimisticNote(tempId, ack.data.note);
      } else {
        this.store.removeNote(tempId);
      }
    } catch {
      this.store.removeNote(tempId);
    }
  }

  async updateNote(noteId: string, text: string, version: number): Promise<void> {
    const ack = await this.realtime
      .emitWithAck<'note:update', UpdateNoteAck>('note:update', { noteId, text, version })
      .catch((): UpdateNoteAck | null => null);

    if (ack?.ok) this.store.upsertNote(ack.data.note);
  }

  async moveNote(
    noteId: string,
    columnId: string,
    position: number,
    version: number,
  ): Promise<void> {
    const previous = this.store.findNote(noteId);
    if (previous) this.store.upsertNote({ ...previous, columnId, position });

    const ack = await this.realtime
      .emitWithAck<'note:move', MoveNoteAck>('note:move', { noteId, columnId, position, version })
      .catch((): MoveNoteAck | null => null);

    if (ack?.ok) {
      this.applyMove(ack.data.note);
    } else if (previous) {
      this.store.upsertNote(previous);
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    const previous = this.store.findNote(noteId);
    this.store.removeNote(noteId);

    const ack = await this.realtime
      .emitWithAck<'note:delete', DeleteNoteAck>('note:delete', { noteId })
      .catch((): DeleteNoteAck | null => null);

    if (!ack?.ok && previous) this.store.upsertNote(previous);
  }

  private applyMove(payload: NoteMovedPayload): void {
    const current = this.store.findNote(payload.noteId);
    if (!current) return;
    this.store.upsertNote({
      ...current,
      columnId: payload.columnId,
      position: payload.position,
      version: payload.version,
    });
  }
}
