import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import type { CreateNoteAck, DeleteNoteAck } from '@collabforge/contracts';
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

    const realtimeMock: Partial<RealtimeService> = {
      connect: connectSpy as unknown as RealtimeService['connect'],
      disconnect: jasmine.createSpy('disconnect') as unknown as RealtimeService['disconnect'],
      emitWithAck: emitWithAckSpy as unknown as RealtimeService['emitWithAck'],
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
    expect(connectSpy).toHaveBeenCalledWith('board-1', 'tok');

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
});
