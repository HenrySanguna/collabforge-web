import { BoardStore } from './board.store';
import type { BoardSnapshot, NoteDto, ParticipantDto } from '@collabforge/contracts';

function aParticipant(overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    userId: 'user-1',
    name: 'Ana',
    avatarColor: '#abcdef',
    role: 'owner',
    isOnline: true,
    ...overrides,
  };
}

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

  it('reset limpia snapshot, notas y participantes', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()], participants: [aParticipant()] }));
    store.reset();
    expect(store.board()).toBeNull();
    expect(store.notes().length).toBe(0);
    expect(store.participants().length).toBe(0);
  });

  it('applySnapshot arma los participantes desde el snapshot', () => {
    store.applySnapshot(aSnapshot({ participants: [aParticipant()] }));
    expect(store.participants()).toEqual([aParticipant()]);
  });

  it('setParticipants reemplaza los participantes sin tocar notas ni snapshot', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()] }));
    store.setParticipants([aParticipant({ userId: 'user-2', name: 'Beto' })]);

    expect(store.participants()).toEqual([aParticipant({ userId: 'user-2', name: 'Beto' })]);
    expect(store.notes().length).toBe(1);
  });

  it('seedFromRest arranca con participantes vacíos', () => {
    store.setParticipants([aParticipant()]);
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

    expect(store.participants().length).toBe(0);
  });

  it('applySnapshot inicializa phase/revealed/timer/votos desde el snapshot', () => {
    store.applySnapshot(
      aSnapshot({
        board: {
          id: 'board-1',
          slug: 's',
          title: 'T',
          phase: 'VOTING',
          revealed: false,
          voteBudget: 3,
          allowMultiVote: false,
          liveTally: true,
          timerEndsAt: '2026-01-01T00:05:00Z',
          isArchived: false,
          ownerId: 'user-1',
        },
        myVotes: { 'note-1': 2 },
        tally: { 'note-1': 4 },
      }),
    );

    expect(store.phase()).toBe('VOTING');
    expect(store.revealed()).toBe(false);
    expect(store.timerEndsAt()).toBe('2026-01-01T00:05:00Z');
    expect(store.timerPaused()).toBe(false);
    expect(store.myVotes()).toEqual({ 'note-1': 2 });
    expect(store.tally()).toEqual({ 'note-1': 4 });
    expect(store.voteBudget()).toBe(3);
    expect(store.liveTally()).toBe(true);
  });

  it('setPhase actualiza phase y revealed sin tocar el resto del snapshot', () => {
    store.applySnapshot(aSnapshot({ notes: [aNote()] }));
    store.setPhase('DISCUSSING', true);

    expect(store.phase()).toBe('DISCUSSING');
    expect(store.revealed()).toBe(true);
    expect(store.notes().length).toBe(1);
  });

  it('setTimerState actualiza endsAt/paused/remainingMs', () => {
    store.setTimerState(null, true, 4000);

    expect(store.timerEndsAt()).toBeNull();
    expect(store.timerPaused()).toBe(true);
    expect(store.timerRemainingMs()).toBe(4000);
  });

  it('applyMyVoteUpdate actualiza solo el voto de esa nota', () => {
    store.applySnapshot(aSnapshot({ myVotes: { 'note-1': 1 } }));
    store.applyMyVoteUpdate('note-2', 1);

    expect(store.myVotes()).toEqual({ 'note-1': 1, 'note-2': 1 });
  });

  it('applyTally reemplaza el tally completo', () => {
    store.applyTally({ 'note-1': 3, 'note-2': 1 });
    expect(store.tally()).toEqual({ 'note-1': 3, 'note-2': 1 });
  });

  it('ordena las notas por votos descendente en DISCUSSING', () => {
    store.applySnapshot(
      aSnapshot({
        board: {
          id: 'board-1',
          slug: 's',
          title: 'T',
          phase: 'DISCUSSING',
          revealed: true,
          voteBudget: 3,
          allowMultiVote: false,
          liveTally: false,
          timerEndsAt: null,
          isArchived: false,
          ownerId: 'user-1',
        },
        notes: [
          aNote({ id: 'n1', position: 1 }),
          aNote({ id: 'n2', position: 2 }),
          aNote({ id: 'n3', position: 3 }),
        ],
        tally: { n1: 1, n2: 5, n3: 3 },
      }),
    );

    const ordered = store.notesByColumn()['col-1'] ?? [];
    expect(ordered.map((n) => n.id)).toEqual(['n2', 'n3', 'n1']);
  });

  it('usa la posición como desempate estable cuando los votos coinciden en DISCUSSING', () => {
    store.applySnapshot(
      aSnapshot({
        board: {
          id: 'board-1',
          slug: 's',
          title: 'T',
          phase: 'DISCUSSING',
          revealed: true,
          voteBudget: 3,
          allowMultiVote: false,
          liveTally: false,
          timerEndsAt: null,
          isArchived: false,
          ownerId: 'user-1',
        },
        notes: [aNote({ id: 'n2', position: 2 }), aNote({ id: 'n1', position: 1 })],
        tally: { n1: 2, n2: 2 },
      }),
    );

    const ordered = store.notesByColumn()['col-1'] ?? [];
    expect(ordered.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('mantiene el orden por posición fuera de DISCUSSING aunque haya tally', () => {
    store.applySnapshot(
      aSnapshot({
        notes: [aNote({ id: 'n2', position: 2 }), aNote({ id: 'n1', position: 1 })],
        tally: { n1: 1, n2: 9 },
      }),
    );

    const ordered = store.notesByColumn()['col-1'] ?? [];
    expect(ordered.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('reset limpia también phase/timer/votos', () => {
    store.applySnapshot(aSnapshot({ myVotes: { 'note-1': 1 }, tally: { 'note-1': 1 } }));
    store.setTimerState('2026-01-01T00:00:00Z', true, 1000);
    store.reset();

    expect(store.phase()).toBeNull();
    expect(store.revealed()).toBe(false);
    expect(store.timerEndsAt()).toBeNull();
    expect(store.timerPaused()).toBe(false);
    expect(store.myVotes()).toEqual({});
    expect(store.tally()).toBeNull();
  });
});
