import type { ActionItemDto, ColumnDto, NoteDto, ParticipantDto } from '@collabforge/contracts';

export interface BoardExportInput {
  title: string;
  slug: string;
  revealed: boolean;
  columns: ColumnDto[];
  notes: NoteDto[];
  tally: Record<string, number> | null;
  actionItems: ActionItemDto[];
  participants: ParticipantDto[];
}

function notesForColumn(
  notes: NoteDto[],
  columnId: string,
  tally: Record<string, number> | null,
): NoteDto[] {
  const inColumn = notes.filter((note) => note.columnId === columnId);
  if (!tally) return [...inColumn].sort((a, b) => a.position - b.position);

  return [...inColumn].sort((a, b) => {
    const votes = (tally[b.id] ?? 0) - (tally[a.id] ?? 0);
    return votes !== 0 ? votes : a.position - b.position;
  });
}

function renderNoteLine(
  note: NoteDto,
  tally: Record<string, number> | null,
  revealed: boolean,
): string {
  const votes = tally?.[note.id] ?? 0;
  const author = revealed && note.author ? ` — _${note.author.name}_` : '';
  return `- ${note.text} (${votes} votos)${author}`;
}

function assigneeName(assigneeId: string | null, participants: ParticipantDto[]): string {
  if (!assigneeId) return 'Sin asignar';
  return participants.find((p) => p.userId === assigneeId)?.name ?? 'Sin asignar';
}

function renderActionItemLine(item: ActionItemDto, participants: ParticipantDto[]): string {
  const checkbox = item.status === 'done' ? '[x]' : '[ ]';
  return `- ${checkbox} ${item.text} — Asignado a: ${assigneeName(item.assigneeId, participants)}`;
}

export function toMarkdown(input: BoardExportInput): string {
  const lines: string[] = [`# ${input.title}`, ''];

  for (const column of input.columns) {
    lines.push(`## ${column.title}`, '');
    const columnNotes = notesForColumn(input.notes, column.id, input.tally);
    if (columnNotes.length === 0) {
      lines.push('_Sin notas en esta columna._');
    } else {
      for (const note of columnNotes) {
        lines.push(renderNoteLine(note, input.tally, input.revealed));
      }
    }
    lines.push('');
  }

  lines.push('## Action items', '');
  if (input.actionItems.length === 0) {
    lines.push('_Sin action items._');
  } else {
    for (const item of input.actionItems) {
      lines.push(renderActionItemLine(item, input.participants));
    }
  }
  lines.push('');

  return lines.join('\n');
}
