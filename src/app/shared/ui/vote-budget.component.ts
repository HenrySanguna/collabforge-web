import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'cf-vote-budget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 text-xs text-neutral-600">
      <span>{{ spent() }} de {{ budget() }} votos usados</span>
      <span class="flex gap-1">
        @for (pip of pips(); track pip) {
          <span
            class="h-2 w-2 rounded-full"
            [class.bg-neutral-700]="pip < spent()"
            [class.bg-neutral-200]="pip >= spent()"
          ></span>
        }
      </span>
    </div>
  `,
})
export class VoteBudgetComponent {
  readonly budget = input.required<number>();
  readonly spent = input.required<number>();

  readonly pips = computed(() => Array.from({ length: this.budget() }, (_, i) => i));
}
