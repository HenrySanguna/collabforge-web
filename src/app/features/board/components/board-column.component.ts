import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { BoardPhase, ColumnDto, NoteDto } from '@collabforge/contracts';
import { StickyNoteComponent } from './sticky-note.component';

const DELETE_ALLOWED_PHASES: readonly BoardPhase[] = ['COLLECTING', 'GROUPING'];

@Component({
  selector: 'cf-board-column',
  standalone: true,
  imports: [ReactiveFormsModule, StickyNoteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-3 rounded-lg border p-4" [attr.aria-label]="column().title">
      <h2 class="font-semibold" [style.color]="column().color">{{ column().title }}</h2>

      @if (canCreate()) {
        <form class="flex gap-2" [formGroup]="draftForm" (ngSubmit)="submit()">
          <input
            class="cf-focus-ring flex-1 rounded border px-2 py-1 text-sm"
            formControlName="draft"
            placeholder="Nueva nota…"
            maxlength="500"
          />
          <button
            type="submit"
            class="cf-focus-ring rounded border px-3 py-1 text-sm"
            [disabled]="draft.invalid"
          >
            Añadir
          </button>
        </form>
      }

      <div class="flex flex-col gap-2">
        @for (note of notes(); track note.id) {
          <cf-sticky-note
            [note]="note"
            [canDelete]="canDelete(note)"
            [voteCount]="voteTally()?.[note.id]"
            [myVoteCount]="myVotes()[note.id] || 0"
            [canVote]="canVote()"
            (deleteRequested)="deleteRequested.emit($event)"
            (voteCast)="voteCast.emit(note.id)"
            (voteRetracted)="voteRetracted.emit(note.id)"
          />
        } @empty {
          <p class="text-xs text-neutral-500">Sin notas todavía.</p>
        }
      </div>
    </section>
  `,
})
export class BoardColumnComponent {
  readonly column = input.required<ColumnDto>();
  readonly notes = input.required<NoteDto[]>();
  readonly canCreate = input(false);
  readonly myUserId = input<string | null>(null);
  readonly myRole = input<'owner' | 'member' | null>(null);
  readonly phase = input<BoardPhase | null>(null);
  readonly voteTally = input<Record<string, number> | null>(null);
  readonly myVotes = input<Record<string, number>>({});
  readonly canVote = input(false);

  readonly noteCreated = output<string>();
  readonly deleteRequested = output<string>();
  readonly voteCast = output<string>();
  readonly voteRetracted = output<string>();

  readonly draft = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly draftForm = new FormGroup({ draft: this.draft });

  canDelete(note: NoteDto): boolean {
    const roleOk = note.author?.userId === this.myUserId() || this.myRole() === 'owner';
    const phase = this.phase();
    const phaseOk = phase === null || DELETE_ALLOWED_PHASES.includes(phase);
    return roleOk && phaseOk;
  }

  submit(): void {
    const text = this.draft.value.trim();
    if (!text) return;
    this.noteCreated.emit(text);
    this.draft.reset('');
  }
}
