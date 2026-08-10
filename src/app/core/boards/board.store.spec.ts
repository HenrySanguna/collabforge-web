import { BoardStore } from './board.store';
import type { BoardSnapshot, NoteDto } from '@collabforge/contracts';

function aSnapshot(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    board: {
      id: 'board-1',
      slug: 'retro-abc',
      title: 'Retro',
      phase: 'COLLECTING',
      revealed: false,
      voteBudget: 3,
      allowMultiVote: false,
      liveTally: false,
      timerEndsAt: null,
      isArchived: false,
      ownerId: 'user-1',
    },
    columns: [{ id: 'col-1', title: 'Start', color: '#fff', position: 0 }],
    notes: [],
    myVotes: {},
    tally: null,
    participants: [],
    actionItems: [],
    myRole: 'owner',
    serverTime: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function aNote(overrides: Partial<NoteDto> = {}): NoteDto {
  return {
    id: 'note-1',
    columnId: 'col-1',
    text: 'Hola',
    position: 1,
    groupId: null,
    version: 1,
    isDiscussed: false,
    author: { userId: 'user-1', name: 'Ana', avatarColor: '#abcdef' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('BoardStore', () => {
  let store: BoardStore;

  beforeEach(() => {
    store = new BoardStore();
  });

  it('aplica el snapshot reemplazando notas previas', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()] }));
    expect(store.notes().length).toBe(1);

    store.applySnapshot(aSnapshot({ notes: [] }));
    expect(store.notes().length).toBe(0);
    expect(store.board()?.id).toBe('board-1');
  });

  it('agrupa las notas por columna y las ordena por posición', () => {
    store.applySnapshot(
      aSnapshot({
        notes: [aNote({ id: 'n2', position: 2 }), aNote({ id: 'n1', position: 1 })],
      }),
    );

    const grouped = store.notesByColumn()['col-1'] ?? [];
    expect(grouped.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('marca una nota optimista como pending', () => {
    store.addOptimisticNote('tmp-1', aNote({ id: 'tmp-1' }));
    expect(store.findNote('tmp-1')?.pending).toBe(true);
  });

  it('reconcilia la nota optimista con el id real del servidor', () => {
    store.addOptimisticNote('tmp-1', aNote({ id: 'tmp-1' }));
    store.reconcileOptimisticNote('tmp-1', aNote({ id: 'note-real' }));

    expect(store.findNote('tmp-1')).toBeUndefined();
    expect(store.findNote('note-real')).toBeDefined();
  });

  it('elimina una nota', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()] }));
    store.removeNote('note-1');
    expect(store.findNote('note-1')).toBeUndefined();
  });

  it('seedFromRest arma un snapshot mínimo desde el detalle REST', () => {
    store.seedFromRest({
      id: 'board-1',
      slug: 'retro-abc',
      title: 'Retro',
      phase: 'COLLECTING',
      isArchived: false,
      myRole: 'member',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ownerId: 'user-1',
      revealed: false,
      voteBudget: 3,
      allowMultiVote: false,
      liveTally: false,
      columns: [{ id: 'col-1', title: 'Start', color: '#fff', position: 0 }],
    });

    expect(store.columns().length).toBe(1);
    expect(store.myRole()).toBe('member');
  });

  it('reset limpia snapshot y notas', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()] }));
    store.reset();
    expect(store.board()).toBeNull();
    expect(store.notes().length).toBe(0);
  });
});
