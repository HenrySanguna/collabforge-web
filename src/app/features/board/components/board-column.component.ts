import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ColumnDto, NoteDto } from '@collabforge/contracts';
import { StickyNoteComponent } from './sticky-note.component';

@Component({
  selector: 'cf-board-column',
  standalone: true,
  imports: [ReactiveFormsModule, StickyNoteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-3 rounded-lg border p-4" [attr.aria-label]="column().title">
      <h2 class="font-semibold" [style.color]="column().color">{{ column().title }}</h2>

      @if (canCreate()) {
        <form class="flex gap-2" (ngSubmit)="submit()">
          <input
            class="cf-focus-ring flex-1 rounded border px-2 py-1 text-sm"
            [formControl]="draft"
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
            (deleteRequested)="deleteRequested.emit($event)"
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

  readonly noteCreated = output<string>();
  readonly deleteRequested = output<string>();

  readonly draft = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  canDelete(note: NoteDto): boolean {
    return note.author?.userId === this.myUserId() || this.myRole() === 'owner';
  }

  submit(): void {
    const text = this.draft.value.trim();
    if (!text) return;
    this.noteCreated.emit(text);
    this.draft.reset('');
  }
}
