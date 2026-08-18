import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ActionItemDto, BoardPhase, ParticipantDto } from '@collabforge/contracts';

export interface ActionItemCreateRequest {
  text: string;
  assigneeId: string | null;
}

export interface ActionItemStatusToggleRequest {
  id: string;
  status: 'open' | 'done';
}

@Component({
  selector: 'cf-action-items-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <section class="flex flex-col gap-3 rounded-md border border-border p-3 text-sm" aria-label="Action items">
        <h2 class="font-semibold">Action items</h2>

        @if (isOwner()) {
          <form class="flex flex-wrap gap-2" [formGroup]="draftForm" (ngSubmit)="submitCreate()">
            <input
              class="cf-focus-ring flex-1 appearance-none rounded border border-border px-2 py-1 text-sm"
              formControlName="text"
              placeholder="Nuevo action item…"
              maxlength="2000"
            />
            <select
              class="cf-focus-ring appearance-none rounded border border-border px-2 py-1 text-sm"
              formControlName="assigneeId"
            >
              <option value="">Sin asignar</option>
              @for (p of participants(); track p.userId) {
                <option [value]="p.userId">{{ p.name }}</option>
              }
            </select>
            <button
              type="submit"
              class="cf-focus-ring rounded border border-border px-3 py-1"
              [disabled]="draftText.invalid"
            >
              Añadir
            </button>
          </form>
        }

        @if (items().length === 0) {
          <p class="text-xs text-foreground-muted">Sin action items todavía.</p>
        } @else {
          <ul class="flex flex-col gap-2">
            @for (item of items(); track item.id) {
              <li class="flex items-center justify-between gap-2">
                <span [class.line-through]="item.status === 'done'">{{ item.text }}</span>
                <span class="text-xs text-foreground-muted">{{ assigneeName(item.assigneeId) }}</span>
                @if (isOwner()) {
                  <button
                    type="button"
                    class="cf-focus-ring rounded border border-border px-2 py-1 text-xs"
                    (click)="toggleStatus(item)"
                  >
                    {{ item.status === 'done' ? 'Reabrir' : 'Completar' }}
                  </button>
                  <button
                    type="button"
                    class="cf-focus-ring rounded border border-border px-2 py-1 text-xs"
                    (click)="remove(item.id)"
                  >
                    Eliminar
                  </button>
                }
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class ActionItemsPanelComponent {
  readonly actionItems = input.required<ActionItemDto[]>();
  readonly participants = input<ParticipantDto[]>([]);
  readonly isOwner = input.required<boolean>();
  readonly phase = input.required<BoardPhase>();

  readonly itemCreated = output<ActionItemCreateRequest>();
  readonly itemStatusToggled = output<ActionItemStatusToggleRequest>();
  readonly itemDeleted = output<string>();

  readonly draftText = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly draftAssigneeId = new FormControl('', { nonNullable: true });
  readonly draftForm = new FormGroup({ text: this.draftText, assigneeId: this.draftAssigneeId });

  readonly visible = computed(() => this.phase() === 'DISCUSSING');
  readonly items = computed(() => this.actionItems());

  assigneeName(assigneeId: string | null): string {
    if (!assigneeId) return 'Sin asignar';
    return this.participants().find((p) => p.userId === assigneeId)?.name ?? 'Sin asignar';
  }

  submitCreate(): void {
    const text = this.draftText.value.trim();
    if (!text) return;

    this.itemCreated.emit({ text, assigneeId: this.draftAssigneeId.value || null });
    this.draftText.reset('');
    this.draftAssigneeId.reset('');
  }

  toggleStatus(item: ActionItemDto): void {
    this.itemStatusToggled.emit({
      id: item.id,
      status: item.status === 'done' ? 'open' : 'done',
    });
  }

  remove(id: string): void {
    this.itemDeleted.emit(id);
  }
}
