import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import type { ParticipantDto } from '@collabforge/contracts';

export interface CursorPosition {
  x: number;
  y: number;
}

interface RectSize {
  width: number;
  height: number;
}

interface CursorEntry {
  userId: string;
  name: string;
  avatarColor: string;
  transform: string;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeCursorPosition(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): CursorPosition {
  const x = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
  const y = rect.height === 0 ? 0 : (clientY - rect.top) / rect.height;
  return { x: clamp01(x), y: clamp01(y) };
}

export function denormalizeCursorPosition(
  position: CursorPosition,
  size: RectSize,
): CursorPosition {
  return { x: position.x * size.width, y: position.y * size.height };
}

@Component({
  selector: 'cf-cursor-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none absolute inset-0 z-10 block overflow-hidden',
  },
  template: `
    @for (entry of cursorEntries(); track entry.userId) {
      <span
        class="pointer-events-none absolute top-0 left-0 flex items-center gap-1"
        [style.transform]="entry.transform"
      >
        <span
          class="h-3 w-3 rounded-full border border-white shadow"
          [style.backgroundColor]="entry.avatarColor"
        ></span>
        <span
          class="rounded px-1 py-0.5 text-xs font-medium text-white shadow"
          [style.backgroundColor]="entry.avatarColor"
        >
          {{ entry.name }}
        </span>
      </span>
    }
  `,
})
export class CursorLayerComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly cursors = input.required<Record<string, CursorPosition>>();
  readonly participants = input.required<ParticipantDto[]>();
  readonly selfUserId = input.required<string | null>();

  readonly cursorMove = output<CursorPosition>();

  private readonly rect = signal<RectSize>({ width: 0, height: 0 });

  readonly cursorEntries = computed<CursorEntry[]>(() => {
    const selfId = this.selfUserId();
    const size = this.rect();
    const participantsById = new Map(this.participants().map((p) => [p.userId, p]));

    const entries: CursorEntry[] = [];
    for (const [userId, position] of Object.entries(this.cursors())) {
      if (userId === selfId) continue;
      const participant = participantsById.get(userId);
      const pixel = denormalizeCursorPosition(position, size);
      entries.push({
        userId,
        name: participant?.name ?? '???',
        avatarColor: participant?.avatarColor ?? '#94a3b8',
        transform: `translate(${pixel.x}px, ${pixel.y}px)`,
      });
    }
    return entries;
  });

  constructor() {
    const trackedElement = this.elementRef.nativeElement.parentElement;
    if (!trackedElement) return;

    this.rect.set(trackedElement.getBoundingClientRect());

    fromEvent<MouseEvent>(trackedElement, 'mousemove')
      .pipe(
        throttleTime(50, undefined, { leading: true, trailing: true }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const bounds = trackedElement.getBoundingClientRect();
        this.rect.set(bounds);
        this.cursorMove.emit(normalizeCursorPosition(event.clientX, event.clientY, bounds));
      });
  }
}
