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

const PHASE_ORDER: BoardPhase[] = ['COLLECTING', 'GROUPING', 'VOTING', 'DISCUSSING'];

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 60;

@Component({
  selector: 'cf-phase-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOwner()) {
      <div class="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm">
        <span class="rounded-full bg-brand-500 px-3 py-1 font-medium text-white">
          Fase: {{ phaseLabel() }}
        </span>

        @for (next of nextPhases(); track next) {
          <button
            type="button"
            class="cf-focus-ring rounded border border-border px-3 py-1"
            (click)="phaseChange.emit(next)"
          >
            {{ isForward(next) ? '→' : '←' }} {{ phaseLabels[next] }}
          </button>
        }

        <span class="mx-1 h-4 w-px bg-border"></span>

        <input
          type="number"
          class="cf-focus-ring w-16 appearance-none rounded border border-border px-2 py-1"
          [min]="minDuration"
          [max]="maxDuration"
          [value]="durationMinutes()"
          (input)="onDurationInput($event)"
        />
        <span class="text-xs text-foreground-muted">min</span>
        <button
          type="button"
          class="cf-focus-ring rounded border border-border px-3 py-1"
          (click)="emitStartTimer()"
        >
          Iniciar temporizador
        </button>
        <button
          type="button"
          class="cf-focus-ring rounded border border-border px-3 py-1"
          (click)="pauseTimer.emit()"
        >
          Pausar
        </button>
        <button
          type="button"
          class="cf-focus-ring rounded border border-border px-3 py-1"
          (click)="cancelTimer.emit()"
        >
          Cancelar
        </button>

        @if (phase() !== 'DISCUSSING') {
          <button
            type="button"
            class="cf-focus-ring rounded border px-3 py-1"
            [class.border-border]="!revealed()"
            [class.border-brand-500]="revealed()"
            [class.bg-brand-50]="revealed()"
            [class.text-brand-600]="revealed()"
            [disabled]="revealed()"
            (click)="reveal.emit()"
          >
            {{ revealed() ? 'Autoría revelada' : 'Revelar autoría' }}
          </button>
        }
      </div>
    }
  `,
})
export class PhaseControlsComponent {
  readonly phase = input.required<BoardPhase>();
  readonly isOwner = input.required<boolean>();
  readonly revealed = input(false);

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

  isForward(next: BoardPhase): boolean {
    return PHASE_ORDER.indexOf(next) > PHASE_ORDER.indexOf(this.phase());
  }

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
