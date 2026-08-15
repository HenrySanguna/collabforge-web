import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { BoardPhase } from '@collabforge/contracts';

const TRANSITIONS: Record<BoardPhase, BoardPhase[]> = {
  COLLECTING: ['GROUPING'],
  GROUPING: ['COLLECTING', 'VOTING'],
  VOTING: ['GROUPING', 'DISCUSSING'],
  DISCUSSING: ['VOTING'],
};

const PHASE_LABELS: Record<BoardPhase, string> = {
  COLLECTING: 'Recolección',
  GROUPING: 'Agrupación',
  VOTING: 'Votación',
  DISCUSSING: 'Discusión',
};

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 60;

@Component({
  selector: 'cf-phase-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOwner()) {
      <div class="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
        <span class="font-medium">Fase: {{ phaseLabel() }}</span>

        @for (next of nextPhases(); track next) {
          <button
            type="button"
            class="cf-focus-ring rounded border px-3 py-1"
            (click)="phaseChange.emit(next)"
          >
            → {{ phaseLabels[next] }}
          </button>
        }

        <span class="mx-1 h-4 w-px bg-neutral-300"></span>

        <input
          type="number"
          class="cf-focus-ring w-16 rounded border px-2 py-1"
          [min]="minDuration"
          [max]="maxDuration"
          [value]="durationMinutes()"
          (input)="onDurationInput($event)"
        />
        <span class="text-xs text-neutral-500">min</span>
        <button
          type="button"
          class="cf-focus-ring rounded border px-3 py-1"
          (click)="emitStartTimer()"
        >
          Iniciar temporizador
        </button>
        <button
          type="button"
          class="cf-focus-ring rounded border px-3 py-1"
          (click)="pauseTimer.emit()"
        >
          Pausar
        </button>
        <button
          type="button"
          class="cf-focus-ring rounded border px-3 py-1"
          (click)="cancelTimer.emit()"
        >
          Cancelar
        </button>

        @if (canReveal()) {
          <button
            type="button"
            class="cf-focus-ring rounded border px-3 py-1"
            (click)="reveal.emit()"
          >
            Revelar autoría
          </button>
        }
      </div>
    }
  `,
})
export class PhaseControlsComponent {
  readonly phase = input.required<BoardPhase>();
  readonly isOwner = input.required<boolean>();

  readonly phaseChange = output<BoardPhase>();
  readonly startTimer = output<number>();
  readonly pauseTimer = output<void>();
  readonly cancelTimer = output<void>();
  readonly reveal = output<void>();

  protected readonly phaseLabels = PHASE_LABELS;
  protected readonly minDuration = MIN_DURATION_MINUTES;
  protected readonly maxDuration = MAX_DURATION_MINUTES;

  readonly durationMinutes = signal(5);

  readonly phaseLabel = computed(() => PHASE_LABELS[this.phase()]);
  readonly nextPhases = computed(() => TRANSITIONS[this.phase()]);
  readonly canReveal = computed(() => this.phase() !== 'DISCUSSING');

  onDurationInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value)) this.durationMinutes.set(value);
  }

  emitStartTimer(): void {
    const clampedMinutes = Math.min(
      MAX_DURATION_MINUTES,
      Math.max(MIN_DURATION_MINUTES, this.durationMinutes()),
    );
    const seconds = Math.min(3600, Math.max(30, Math.round(clampedMinutes * 60)));
    this.startTimer.emit(seconds);
  }
}
