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

      @if (canVote() || voteCount() !== undefined || myVoteCount() > 0) {
        <div class="mt-2 flex items-center gap-2 text-xs">
          @if (canVote()) {
            <button
              type="button"
              class="cf-focus-ring rounded border px-2 py-0.5"
              (click)="voteCast.emit()"
            >
              Votar
            </button>
            @if (myVoteCount() > 0) {
              <button
                type="button"
                class="cf-focus-ring rounded border px-2 py-0.5"
                (click)="voteRetracted.emit()"
              >
                Quitar voto
              </button>
            }
          }
          @if (voteCount() !== undefined) {
            <span>{{ voteCount() }} votos</span>
          }
          @if (myVoteCount() > 0) {
            <span class="text-neutral-500">Tú: {{ myVoteCount() }}</span>
          }
        </div>
      }
    </article>
  `,
})
export class StickyNoteComponent {
  readonly note = input.required<NoteDto & { pending?: boolean }>();
  readonly canDelete = input(false);
  readonly voteCount = input<number | undefined>(undefined);
  readonly myVoteCount = input<number>(0);
  readonly canVote = input(false);

  readonly deleteRequested = output<string>();
  readonly voteCast = output<void>();
  readonly voteRetracted = output<void>();
}
