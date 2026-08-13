import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ParticipantDto } from '@collabforge/contracts';

@Component({
  selector: 'cf-presence-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center -space-x-2">
      @for (participant of orderedParticipants(); track participant.userId) {
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
          [style.backgroundColor]="participant.avatarColor"
          [title]="
            participant.userId === selfUserId() ? participant.name + ' (tú)' : participant.name
          "
        >
          {{ participant.name.charAt(0).toUpperCase() }}
        </span>
      }
    </div>
  `,
})
export class PresenceBarComponent {
  readonly participants = input.required<ParticipantDto[]>();
  readonly selfUserId = input.required<string | null>();

  readonly orderedParticipants = computed(() => {
    const selfId = this.selfUserId();
    return [...this.participants()].sort((a, b) => {
      if (a.userId === selfId) return -1;
      if (b.userId === selfId) return 1;
      return 0;
    });
  });
}
