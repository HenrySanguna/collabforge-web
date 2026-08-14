import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

const LOW_TIME_THRESHOLD_MS = 30_000;

export function computeDriftMs(serverTime: string, now: number): number {
  return now - Date.parse(serverTime);
}

export function computeRemainingMs(endsAt: string, driftMs: number, now: number): number {
  return Math.max(0, Date.parse(endsAt) - (now - driftMs));
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'cf-session-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (paused()) {
      <p class="cf-focus-ring rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Pausado
      </p>
    } @else if (endsAt()) {
      <p
        class="cf-focus-ring rounded-md px-3 py-1 text-xs font-medium"
        [class.bg-red-100]="isLowTime()"
        [class.text-red-800]="isLowTime()"
        [class.bg-neutral-100]="!isLowTime()"
      >
        {{ display() }}
      </p>
    }
  `,
})
export class SessionTimerComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly endsAt = input<string | null>(null);
  readonly serverTime = input.required<string>();
  readonly paused = input(false);

  // Angular no permite leer un input.required() de forma síncrona en el constructor o en
  // un inicializador de campo (el valor recién se aplica después de crear la instancia),
  // así que el drift se calcula de forma perezosa dentro de un computed(). En la práctica
  // serverTime solo cambia cuando llega un nuevo board:sync completo (conexión inicial o
  // reveal), así que esto sigue equivaliendo a "una vez al cargar" en el uso normal.
  private readonly driftMs = computed(() => computeDriftMs(this.serverTime(), Date.now()));
  private readonly now = signal(Date.now());

  readonly remainingMs = computed(() => {
    const endsAt = this.endsAt();
    if (!endsAt) return 0;
    return computeRemainingMs(endsAt, this.driftMs(), this.now());
  });

  readonly display = computed(() => formatCountdown(this.remainingMs()));
  readonly isLowTime = computed(
    () => this.remainingMs() > 0 && this.remainingMs() <= LOW_TIME_THRESHOLD_MS,
  );

  constructor() {
    const interval = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }
}
