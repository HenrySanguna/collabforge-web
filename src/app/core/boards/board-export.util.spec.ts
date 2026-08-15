import { toMarkdown } from './board-export.util';
import type { ActionItemDto, ColumnDto, NoteDto, ParticipantDto } from '@collabforge/contracts';

function aColumn(overrides: Partial<ColumnDto> = {}): ColumnDto {
  return { id: 'col-1', title: 'Start', color: '#fff', position: 0, ...overrides };
}

function aNote(overrides: Partial<NoteDto> = {}): NoteDto {
  return {
    id: 'note-1',
    columnId: 'col-1',
    text: 'Hola',
    position: 0,
    groupId: null,
    version: 1,
    isDiscussed: false,
    author: { userId: 'user-1', name: 'Ana', avatarColor: '#abc' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function anActionItem(overrides: Partial<ActionItemDto> = {}): ActionItemDto {
  return {
    id: 'item-1',
    text: 'Seguir con X',
    assigneeId: null,
    status: 'open',
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function aParticipant(overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    userId: 'user-2',
    name: 'Beto',
    avatarColor: '#000',
    role: 'member',
    isOnline: true,
    ...overrides,
  };
}

describe('toMarkdown', () => {
  it('incluye título, columnas, notas, votos y action items', () => {
    const markdown = toMarkdown({
      title: 'Retro Sprint 12',
      slug: 'retro-12',
      revealed: false,
      columns: [aColumn()],
      notes: [aNote({ text: 'Nota A' })],
      tally: { 'note-1': 3 },
      actionItems: [anActionItem({ text: 'Hacer seguimiento' })],
      participants: [],
    });

    expect(markdown).toContain('# Retro Sprint 12');
    expect(markdown).toContain('Start');
    expect(markdown).toContain('Nota A');
    expect(markdown).toContain('3');
    expect(markdown).toContain('Hacer seguimiento');
  });

  it('oculta la autoría de las notas cuando revealed es false', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: false,
      columns: [aColumn()],
      notes: [aNote({ author: { userId: 'user-1', name: 'Ana', avatarColor: '#abc' } })],
      tally: null,
      actionItems: [],
      participants: [],
    });

    expect(markdown).not.toContain('Ana');
  });

  it('muestra la autoría de las notas cuando revealed es true', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: true,
      columns: [aColumn()],
      notes: [aNote({ author: { userId: 'user-1', name: 'Ana', avatarColor: '#abc' } })],
      tally: null,
      actionItems: [],
      participants: [],
    });

    expect(markdown).toContain('Ana');
  });

  it('resuelve el nombre del asignado de un action item a partir de los participantes', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: false,
      columns: [],
      notes: [],
      tally: null,
      actionItems: [anActionItem({ assigneeId: 'user-2' })],
      participants: [aParticipant({ userId: 'user-2', name: 'Beto' })],
    });

    expect(markdown).toContain('Beto');
  });

  it('marca los action items en estado done', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: false,
      columns: [],
      notes: [],
      tally: null,
      actionItems: [anActionItem({ status: 'done' })],
      participants: [],
    });

    expect(markdown).toContain('[x]');
  });

  it('indica cuando una columna no tiene notas', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: false,
      columns: [aColumn()],
      notes: [],
      tally: null,
      actionItems: [],
      participants: [],
    });

    expect(markdown).toContain('Sin notas');
  });

  it('indica cuando no hay action items', () => {
    const markdown = toMarkdown({
      title: 'Retro',
      slug: 'retro',
      revealed: false,
      columns: [],
      notes: [],
      tally: null,
      actionItems: [],
      participants: [],
    });

    expect(markdown).toContain('Sin action items');
  });
});
