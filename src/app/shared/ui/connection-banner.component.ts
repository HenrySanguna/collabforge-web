import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ConnectionState } from '../../core/realtime/realtime.service';

@Component({
  selector: 'cf-connection-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as text) {
      <p
        class="cf-focus-ring rounded-md border px-3 py-1 text-xs font-medium"
        [class.bg-surface-alt]="state() === 'connecting' || state() === 'reconnecting'"
        [class.text-foreground-muted]="state() === 'connecting' || state() === 'reconnecting'"
        [class.border-border]="state() !== 'disconnected'"
        [class.bg-danger]="state() === 'disconnected'"
        [class.border-danger]="state() === 'disconnected'"
        [class.text-white]="state() === 'disconnected'"
      >
        {{ text }}
      </p>
    }
  `,
})
export class ConnectionBannerComponent {
  readonly state = input.required<ConnectionState>();

  readonly label = computed(() => {
    switch (this.state()) {
      case 'connecting':
        return 'Conectando…';
      case 'reconnecting':
        return 'Reconectando…';
      case 'disconnected':
        return 'Sin conexión';
      case 'connected':
      case 'idle':
        return null;
    }
  });
}
