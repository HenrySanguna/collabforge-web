import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { BoardSummaryDto } from '../../../core/boards/models/board.models';

const PHASE_LABELS: Record<BoardSummaryDto['phase'], string> = {
  COLLECTING: 'Recolección',
  GROUPING: 'Agrupación',
  VOTING: 'Votación',
  DISCUSSING: 'Discusión',
};

@Component({
  selector: 'cf-board-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="cf-focus-ring flex w-full flex-col gap-2 rounded-lg border p-4 text-left shadow-sm transition hover:shadow-md"
      [class.opacity-60]="board().isArchived"
      (click)="boardSelected.emit()"
    >
      <h3 class="font-semibold">{{ board().title }}</h3>
      <div class="flex items-center justify-between text-xs text-neutral-500">
        <span>{{ phaseLabel() }}</span>
        <span>{{ board().myRole === 'owner' ? 'Facilitador' : 'Participante' }}</span>
      </div>
      @if (board().isArchived) {
        <span class="text-xs text-neutral-400">Archivado</span>
      }
    </button>
  `,
})
export class BoardCardComponent {
  readonly board = input.required<BoardSummaryDto>();
  readonly boardSelected = output<void>();

  protected phaseLabel(): string {
    return PHASE_LABELS[this.board().phase];
  }
}
