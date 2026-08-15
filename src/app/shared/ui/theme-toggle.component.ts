import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'cf-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="cf-focus-ring rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground"
      [attr.aria-pressed]="theme.theme() === 'dark'"
      aria-label="Cambiar tema"
      (click)="theme.toggle()"
    >
      {{ theme.theme() === 'dark' ? 'Oscuro' : 'Claro' }}
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
