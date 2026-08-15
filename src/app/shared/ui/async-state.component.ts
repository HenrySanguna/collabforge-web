import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type AsyncViewState = 'loading' | 'empty' | 'error';

@Component({
  selector: 'cf-async-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') {
        <div
          role="status"
          class="flex items-center justify-center gap-2 py-8 text-sm text-foreground-muted"
        >
          <span>{{ message() ?? 'Cargando…' }}</span>
        </div>
      }
      @case ('empty') {
        <div
          role="status"
          class="flex items-center justify-center py-8 text-sm text-foreground-muted"
        >
          <span>{{ message() ?? 'No hay datos para mostrar.' }}</span>
        </div>
      }
      @case ('error') {
        <div
          role="alert"
          class="flex flex-col items-center justify-center gap-2 py-8 text-sm text-danger"
        >
          <span>{{ message() ?? 'Ocurrió un error.' }}</span>
          @if (retryLabel(); as label) {
            <button
              type="button"
              class="cf-focus-ring rounded-md border border-border px-3 py-1 text-xs font-medium"
              (click)="retry.emit()"
            >
              {{ label }}
            </button>
          }
        </div>
      }
    }
  `,
})
export class AsyncStateComponent {
  readonly state = input.required<AsyncViewState>();
  readonly message = input<string | null>(null);
  readonly retryLabel = input<string | null>(null);
  readonly retry = output<void>();
}
