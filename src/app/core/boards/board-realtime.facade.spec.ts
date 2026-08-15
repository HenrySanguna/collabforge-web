import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import type {
  ActionItemDto,
  CreateActionItemAck,
  CreateNoteAck,
  DeleteActionItemAck,
  DeleteNoteAck,
  UpdateActionItemAck,
} from '@collabforge/contracts';
import { BoardRealtimeFacade } from './board-realtime.facade';
import { BoardStore } from './board.store';
import { AuthStore } from '../auth/auth.store';
import { RealtimeService } from '../realtime/realtime.service';
import type { ConnectionState } from '../realtime/realtime.service';

describe('BoardRealtimeFacade', () => {
  let facade: BoardRealtimeFacade;
  let store: BoardStore;
  let auth: AuthStore;
  let connectSpy: jasmine.Spy;
  let emitWithAckSpy: jasmine.Spy;
  let emitVolatileSpy: jasmine.Spy;
  let socketHandlers: Record<string, (payload: unknown) => void>;

  beforeEach(() => {
    socketHandlers = {};
    const fakeSocket = {
      on: (event: string, handler: (payload: unknown) => void) => {
        socketHandlers[event] = handler;
      },
    };

    connectSpy = jasmine.createSpy('connect').and.returnValue(fakeSocket);
    emitWithAckSpy = jasmine.createSpy('emitWithAck');
    emitVolatileSpy = jasmine.createSpy('emitVolatile');

    const realtimeMock: Partial<RealtimeService> = {
      connect: connectSpy as unknown as RealtimeService['connect'],
      disconnect: jasmine.createSpy('disconnect') as unknown as RealtimeService['disconnect'],
      emitWithAck: emitWithAckSpy as unknown as RealtimeService['emitWithAck'],
      emitVolatile: emitVolatileSpy as unknown as RealtimeService['emitVolatile'],
      state: signal<ConnectionState>('idle').asReadonly(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: RealtimeService, useValue: realtimeMock },
      ],
    });

    facade = TestBed.inject(BoardRealtimeFacade);
    store = TestBed.inject(BoardStore);
    auth = TestBed.inject(AuthStore);
    auth.setSession('tok', { id: 'user-1', email: 'ana@test.com', name: 'Ana' });
  });

  it('lanza si no hay token de acceso', () => {
    auth.clear();
    expect(() => facade.connect('board-1')).toThrowError();
  });

  it('conecta y aplica el snapshot al recibir board:sync', () => {
    facade.connect('board-1');
    expect(connectSpy).toHaveBeenCalledWith('board-1', 'tok', jasmine.any(String));

    socketHandlers['board:sync']({
      board: {
        id: 'board-1',
        slug: 's',
        title: 'T',
        phase: 'COLLECTING',
        revealed: false,
        voteBudget: 3,
        allowMultiVote: false,
        liveTally: false,
        timerEndsAt: null,
        isArchived: false,
        ownerId: 'user-1',
      },
      columns: [],
      notes: [],
      myVotes: {},
      tally: null,
      participants: [],
      actionItems: [],
      myRole: 'owner',
      serverTime: 'x',
    });

    expect(store.board()?.id).toBe('board-1');
  });

  it('crea una nota optimista y la reconcilia con el ack', async () => {
    emitWithAckSpy.and.returnValue(
      Promise.resolve<CreateNoteAck>({
        ok: true,
        data: {
          note: {
            id: 'note-real',
            columnId: 'col-1',
            text: 'Hola',
            position: 1,
            groupId: null,
            version: 1,
            isDiscussed: false,
            author: null,
            createdAt: 'x',
          },
          tempId: 'ignored',
        },
      }),
    );

    const promise = facade.createNote('col-1', 'Hola');
    expect(store.notes()[0].pending).toBe(true);

    await promise;

    expect(store.notes().length).toBe(1);
    expect(store.notes()[0].pending).toBeUndefined();
    expect(store.notes()[0].id).toBe('note-real');
  });

  it('descarta la nota optimista si el ack rechaza', async () => {
    emitWithAckSpy.and.returnValue(
      Promise.resolve<CreateNoteAck>({
        ok: false,
        error: { code: 'BOARD_ARCHIVED', message: 'x' },
      }),
    );

    await facade.createNote('col-1', 'Hola');
    expect(store.notes().length).toBe(0);
  });

  it('revierte el borrado si el ack falla', async () => {
    store.upsertNote({
      id: 'note-1',
      columnId: 'col-1',
      text: 'Hola',
      position: 1,
      groupId: null,
      version: 1,
      isDiscussed: false,
      author: null,
      createdAt: 'x',
    });
    emitWithAckSpy.and.returnValue(Promise.reject<DeleteNoteAck>(new Error('ACK_TIMEOUT')));

    await facade.deleteNote('note-1');
    expect(store.findNote('note-1')).toBeDefined();
  });

  it('aplica los participantes al recibir presence:updated', () => {
    facade.connect('board-1');

    socketHandlers['presence:updated']({
      participants: [
        { userId: 'user-1', name: 'Ana', avatarColor: '#fff', role: 'owner', isOnline: true },
      ],
    });

    expect(store.participants().map((p) => p.userId)).toEqual(['user-1']);
  });

  it('guarda la posición del cursor remoto al recibir cursor:moved', () => {
    facade.connect('board-1');

    socketHandlers['cursor:moved']({ userId: 'user-2', x: 0.4, y: 0.6 });

    expect(facade.cursors()['user-2']).toEqual({ x: 0.4, y: 0.6 });
  });

  it('elimina cursores de usuarios que ya no están presentes al recibir presence:updated', () => {
    facade.connect('board-1');

    socketHandlers['cursor:moved']({ userId: 'user-2', x: 0.4, y: 0.6 });
    socketHandlers['cursor:moved']({ userId: 'user-3', x: 0.1, y: 0.1 });
    expect(Object.keys(facade.cursors())).toEqual(['user-2', 'user-3']);

    socketHandlers['presence:updated']({
      participants: [
        { userId: 'user-1', name: 'Ana', avatarColor: '#fff', role: 'owner', isOnline: true },
        { userId: 'user-2', name: 'Beto', avatarColor: '#000', role: 'member', isOnline: true },
      ],
    });

    expect(Object.keys(facade.cursors())).toEqual(['user-2']);
  });

  it('sendCursor delega en realtime.emitVolatile con las coordenadas normalizadas', () => {
    facade.sendCursor(0.25, 0.75);

    expect(emitVolatileSpy).toHaveBeenCalledWith('cursor:move', { x: 0.25, y: 0.75 });
  });

  it('disconnect limpia el mapa de cursores', () => {
    facade.connect('board-1');
    socketHandlers['cursor:moved']({ userId: 'user-2', x: 0.1, y: 0.1 });
    expect(Object.keys(facade.cursors()).length).toBe(1);

    facade.disconnect();

    expect(facade.cursors()).toEqual({});
  });

  it('actualiza phase/revealed en el store al recibir session:phase-changed', () => {
    facade.connect('board-1');

    socketHandlers['session:phase-changed']({ phase: 'VOTING', revealed: false });

    expect(store.phase()).toBe('VOTING');
    expect(store.revealed()).toBe(false);
  });

  it('actualiza el timer en el store al recibir session:timer-updated', () => {
    facade.connect('board-1');

    socketHandlers['session:timer-updated']({
      endsAt: '2026-01-01T00:05:00Z',
      paused: false,
      remainingMs: undefined,
    });

    expect(store.timerEndsAt()).toBe('2026-01-01T00:05:00Z');
    expect(store.timerPaused()).toBe(false);
  });

  it('aplica el tally del room al recibir vote:tally', () => {
    facade.connect('board-1');

    socketHandlers['vote:tally']({ tally: { 'note-1': 3 } });

    expect(store.tally()).toEqual({ 'note-1': 3 });
  });

  it('aplica el voto propio al recibir vote:my-update', () => {
    facade.connect('board-1');

    socketHandlers['vote:my-update']({ noteId: 'note-1', count: 2, remaining: 1 });

    expect(store.myVotes()).toEqual({ 'note-1': 2 });
  });

  it('marca kicked y desconecta al recibir board:kicked', () => {
    facade.connect('board-1');

    socketHandlers['board:kicked']({ reason: 'KICKED_BY_OWNER' });

    expect(facade.kicked()).toBe(true);
  });

  it('castVote emite vote:cast con el noteId', async () => {
    emitWithAckSpy.and.returnValue(Promise.resolve({ ok: true, data: { remaining: 2 } }));

    await facade.castVote('note-1');

    expect(emitWithAckSpy).toHaveBeenCalledWith('vote:cast', { noteId: 'note-1' });
  });

  it('castVote no lanza si el ack falla', async () => {
    emitWithAckSpy.and.returnValue(Promise.reject(new Error('ACK_TIMEOUT')));

    await expectAsync(facade.castVote('note-1')).toBeResolved();
  });

  it('retractVote emite vote:retract con el noteId', async () => {
    emitWithAckSpy.and.returnValue(Promise.resolve({ ok: true, data: { remaining: 3 } }));

    await facade.retractVote('note-1');

    expect(emitWithAckSpy).toHaveBeenCalledWith('vote:retract', { noteId: 'note-1' });
  });

  it('changePhase emite session:change-phase con la fase destino', async () => {
    emitWithAckSpy.and.returnValue(Promise.resolve({ ok: true, data: undefined }));

    await facade.changePhase('VOTING');

    expect(emitWithAckSpy).toHaveBeenCalledWith('session:change-phase', { phase: 'VOTING' });
  });

  it('startTimer emite session:start-timer con la duración', async () => {
    emitWithAckSpy.and.returnValue(
      Promise.resolve({ ok: true, data: { endsAt: '2026-01-01T00:05:00Z' } }),
    );

    await facade.startTimer(300);

    expect(emitWithAckSpy).toHaveBeenCalledWith('session:start-timer', { durationSeconds: 300 });
  });

  it('pauseTimer/cancelTimer/reveal emiten sus eventos sin payload', async () => {
    emitWithAckSpy.and.returnValue(Promise.resolve({ ok: true, data: undefined }));

    await facade.pauseTimer();
    await facade.cancelTimer();
    await facade.reveal();

    expect(emitWithAckSpy).toHaveBeenCalledWith('session:pause-timer', undefined);
    expect(emitWithAckSpy).toHaveBeenCalledWith('session:cancel-timer', undefined);
    expect(emitWithAckSpy).toHaveBeenCalledWith('session:reveal', undefined);
  });

  it('kickMember emite member:kick con el userId', async () => {
    emitWithAckSpy.and.returnValue(Promise.resolve({ ok: true, data: undefined }));

    await facade.kickMember('user-2');

    expect(emitWithAckSpy).toHaveBeenCalledWith('member:kick', { userId: 'user-2' });
  });

  it('aplica un action item al recibir action-item:created', () => {
    facade.connect('board-1');

    const item: ActionItemDto = {
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'open',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    socketHandlers['action-item:created'](item);

    expect(store.actionItems()).toEqual([item]);
  });

  it('aplica un action item al recibir action-item:updated', () => {
    facade.connect('board-1');

    const item: ActionItemDto = {
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'done',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    socketHandlers['action-item:updated'](item);

    expect(store.actionItems()).toEqual([item]);
  });

  it('elimina un action item al recibir action-item:deleted', () => {
    facade.connect('board-1');
    store.upsertActionItem({
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'open',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    });

    socketHandlers['action-item:deleted']({ id: 'item-1' });

    expect(store.actionItems()).toEqual([]);
  });

  it('createActionItem emite action-item:create y aplica el item del ack', async () => {
    const item: ActionItemDto = {
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: 'user-2',
      status: 'open',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    emitWithAckSpy.and.returnValue(
      Promise.resolve<CreateActionItemAck>({ ok: true, data: { item } }),
    );

    await facade.createActionItem('Seguir con X', 'user-2');

    expect(emitWithAckSpy).toHaveBeenCalledWith('action-item:create', {
      text: 'Seguir con X',
      assigneeId: 'user-2',
    });
    expect(store.actionItems()).toEqual([item]);
  });

  it('createActionItem no aplica nada si el ack falla', async () => {
    emitWithAckSpy.and.returnValue(
      Promise.resolve<CreateActionItemAck>({
        ok: false,
        error: { code: 'FORBIDDEN_ROLE', message: 'x' },
      }),
    );

    await facade.createActionItem('Seguir con X');

    expect(store.actionItems()).toEqual([]);
  });

  it('updateActionItem emite action-item:update y aplica el item del ack', async () => {
    const item: ActionItemDto = {
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'done',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    };
    emitWithAckSpy.and.returnValue(
      Promise.resolve<UpdateActionItemAck>({ ok: true, data: { item } }),
    );

    await facade.updateActionItem({ id: 'item-1', status: 'done' });

    expect(emitWithAckSpy).toHaveBeenCalledWith('action-item:update', {
      id: 'item-1',
      status: 'done',
    });
    expect(store.actionItems()).toEqual([item]);
  });

  it('deleteActionItem emite action-item:delete y elimina el item del store en éxito', async () => {
    store.upsertActionItem({
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'open',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    emitWithAckSpy.and.returnValue(
      Promise.resolve<DeleteActionItemAck>({ ok: true, data: undefined }),
    );

    await facade.deleteActionItem('item-1');

    expect(emitWithAckSpy).toHaveBeenCalledWith('action-item:delete', { id: 'item-1' });
    expect(store.actionItems()).toEqual([]);
  });

  it('deleteActionItem no elimina el item si el ack falla', async () => {
    store.upsertActionItem({
      id: 'item-1',
      text: 'Seguir con X',
      assigneeId: null,
      status: 'open',
      createdBy: 'user-1',
      createdAt: '2026-01-01T00:00:00Z',
    });
    emitWithAckSpy.and.returnValue(
      Promise.resolve<DeleteActionItemAck>({
        ok: false,
        error: { code: 'FORBIDDEN_ROLE', message: 'x' },
      }),
    );

    await facade.deleteActionItem('item-1');

    expect(store.actionItems().length).toBe(1);
  });
});
