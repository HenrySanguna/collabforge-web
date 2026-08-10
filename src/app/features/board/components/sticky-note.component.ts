import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { NoteDto } from '@collabforge/contracts';

@Component({
  selector: 'cf-sticky-note',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-md border bg-white p-3 shadow-sm" [class.opacity-60]="note().pending">
      <p class="text-sm whitespace-pre-wrap">{{ note().text }}</p>

      @if (note().author; as author) {
        <p class="mt-2 text-xs text-neutral-500">{{ author.name }}</p>
      } @else {
        <p class="mt-2 text-xs text-neutral-400">Anónimo</p>
      }

      @if (canDelete()) {
        <button
          type="button"
          class="cf-focus-ring mt-2 text-xs text-red-600 underline"
          (click)="deleteRequested.emit(note().id)"
        >
          Eliminar
        </button>
      }
    </article>
  `,
})
export class StickyNoteComponent {
  readonly note = input.required<NoteDto & { pending?: boolean }>();
  readonly canDelete = input(false);

  readonly deleteRequested = output<string>();
}
