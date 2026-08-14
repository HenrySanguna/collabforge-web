import { Injectable, inject, signal } from '@angular/core';
import type {
  Ack,
  BoardPhase,
  BoardSnapshot,
  CastVoteAck,
  CreateNoteAck,
  DeleteNoteAck,
  MoveNoteAck,
  NoteDto,
  NoteMovedPayload,
  RetractVoteAck,
  StartTimerAck,
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
  private readonly _kicked = signal(false);

  readonly connectionState = this.realtime.state;
  readonly cursors = this._cursors.asReadonly();
  readonly kicked = this._kicked.asReadonly();

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
    socket.on('session:phase-changed', ({ phase, revealed }) => {
      this.store.setPhase(phase, revealed);
    });
    socket.on('session:timer-updated', ({ endsAt, paused, remainingMs }) => {
      this.store.setTimerState(endsAt, paused, remainingMs);
    });
    // board:revealed no trae datos aplicables: el backend reenvía un board:sync completo
    // por viewer inmediatamente después, y ese sync ya trae notas/autoría/tally revelados.
    socket.on('vote:tally', ({ tally }) => this.store.applyTally(tally));
    socket.on('vote:my-update', ({ noteId, count }) => this.store.applyMyVoteUpdate(noteId, count));
    socket.on('board:kicked', () => {
      // Se marca kicked=true y se cierra la conexión, pero SIN pasar por disconnect():
      // ese método resetea _kicked a false (para dejarlo limpio antes de conectar a otro
      // tablero), lo que borraría la señal antes de que board.page pueda reaccionar y
      // navegar. disconnect() sí se llama luego, normalmente desde el DestroyRef.onDestroy
      // de board.page tras la navegación, y ahí ya es seguro resetear kicked.
      this._kicked.set(true);
      this.teardown();
    });
  }

  disconnect(): void {
    this.teardown();
    this._kicked.set(false);
  }

  private teardown(): void {
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

  // A diferencia de createNote/moveNote, el voto no se aplica de forma optimista: el
  // presupuesto (voteBudget), allowMultiVote y la validación transaccional viven en el
  // servidor, y un valor optimista incorrecto en algo tan visible como "cuántos votos me
  // quedan" es peor que la latencia de esperar el ack. vote:my-update / vote:tally (ya
  // escuchados en connect()) llegan casi de inmediato y son la fuente de verdad.
  async castVote(noteId: string): Promise<void> {
    await this.realtime
      .emitWithAck<'vote:cast', CastVoteAck>('vote:cast', { noteId })
      .catch((): CastVoteAck | null => null);
  }

  async retractVote(noteId: string): Promise<void> {
    await this.realtime
      .emitWithAck<'vote:retract', RetractVoteAck>('vote:retract', { noteId })
      .catch((): RetractVoteAck | null => null);
  }

  // Acciones de owner: el backend es la autoridad real (un no-owner recibe FORBIDDEN_ROLE
  // en el ack), la UI solo evita mostrar los controles. session:phase-changed /
  // session:timer-updated / board:revealed ya actualizan el store, así que no hace falta
  // aplicar nada más aquí a partir del ack.
  async changePhase(phase: BoardPhase): Promise<void> {
    await this.realtime
      .emitWithAck<'session:change-phase', Ack<void>>('session:change-phase', { phase })
      .catch((): Ack<void> | null => null);
  }

  async startTimer(durationSeconds: number): Promise<void> {
    await this.realtime
      .emitWithAck<'session:start-timer', StartTimerAck>('session:start-timer', {
        durationSeconds,
      })
      .catch((): StartTimerAck | null => null);
  }

  async pauseTimer(): Promise<void> {
    await this.realtime
      .emitWithAck<'session:pause-timer', Ack<void>>('session:pause-timer', undefined)
      .catch((): Ack<void> | null => null);
  }

  async cancelTimer(): Promise<void> {
    await this.realtime
      .emitWithAck<'session:cancel-timer', Ack<void>>('session:cancel-timer', undefined)
      .catch((): Ack<void> | null => null);
  }

  async reveal(): Promise<void> {
    await this.realtime
      .emitWithAck<'session:reveal', Ack<void>>('session:reveal', undefined)
      .catch((): Ack<void> | null => null);
  }

  async kickMember(userId: string): Promise<void> {
    await this.realtime
      .emitWithAck<'member:kick', Ack<void>>('member:kick', { userId })
      .catch((): Ack<void> | null => null);
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
