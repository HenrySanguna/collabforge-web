import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ParticipantDto } from '@collabforge/contracts';

@Component({
  selector: 'cf-presence-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-1">
      @for (participant of orderedParticipants(); track participant.userId) {
        <div class="relative -mr-2 last:mr-0">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface text-xs font-semibold text-white"
            [style.backgroundColor]="participant.avatarColor"
            [title]="
              participant.userId === selfUserId() ? participant.name + ' (tú)' : participant.name
            "
          >
            {{ participant.name.charAt(0).toUpperCase() }}
          </span>
          @if (isOwner() && participant.userId !== selfUserId()) {
            <button
              type="button"
              class="cf-focus-ring absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-surface bg-danger text-[10px] leading-none text-white"
              [attr.aria-label]="'Expulsar a ' + participant.name"
              [title]="'Expulsar a ' + participant.name"
              (click)="kickRequested.emit(participant.userId)"
            >
              ×
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class PresenceBarComponent {
  readonly participants = input.required<ParticipantDto[]>();
  readonly selfUserId = input.required<string | null>();
  readonly isOwner = input(false);

  readonly kickRequested = output<string>();

  readonly orderedParticipants = computed(() => {
    const selfId = this.selfUserId();
    return [...this.participants()].sort((a, b) => {
      if (a.userId === selfId) return -1;
      if (b.userId === selfId) return 1;
      return 0;
    });
  });
}
