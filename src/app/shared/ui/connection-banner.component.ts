import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ConnectionState } from '../../core/realtime/realtime.service';

@Component({
  selector: 'cf-connection-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as text) {
      <p
        class="cf-focus-ring rounded-md px-3 py-1 text-xs font-medium"
        [class.bg-amber-100]="state() === 'connecting' || state() === 'reconnecting'"
        [class.text-amber-800]="state() === 'connecting' || state() === 'reconnecting'"
        [class.bg-red-100]="state() === 'disconnected'"
        [class.text-red-800]="state() === 'disconnected'"
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
