import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';
import { BoardsService } from '../../core/boards/boards.service';
import { BOARD_TEMPLATE_OPTIONS } from '../../core/boards/board-templates';
import type { BoardSummaryDto } from '../../core/boards/models/board.models';
import { BoardCardComponent } from './components/board-card.component';
import { AsyncStateComponent } from '../../shared/ui/async-state.component';

interface CreateBoardForm {
  title: FormControl<string>;
  templateKey: FormControl<string>;
}

@Component({
  selector: 'cf-dashboard-page',
  standalone: true,
  imports: [ReactiveFormsModule, BoardCardComponent, AsyncStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-semibold">Hola, {{ store.user()?.name }}</h1>
        <button type="button" class="cf-focus-ring rounded-md border border-border px-4 py-2" (click)="logout()">
          Cerrar sesión
        </button>
      </header>

      <button
        type="button"
        class="cf-focus-ring w-fit rounded-md bg-brand-600 px-4 py-2 text-white"
        (click)="showCreateForm.set(!showCreateForm())"
      >
        {{ showCreateForm() ? 'Cancelar' : 'Nuevo tablero' }}
      </button>

      @if (showCreateForm()) {
        <form
          class="flex flex-col gap-4 rounded-md border border-border p-4"
          [formGroup]="createForm"
          (ngSubmit)="submit()"
        >
          <label class="flex flex-col gap-1">
            <span class="text-sm">Título</span>
            <input
              type="text"
              formControlName="title"
              class="cf-focus-ring appearance-none rounded-md border border-border px-3 py-2"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-sm">Plantilla</span>
            <select formControlName="templateKey" class="cf-focus-ring cursor-pointer rounded-md border border-border px-3 py-2">
              @for (option of templateOptions; track option.key) {
                <option [value]="option.key">{{ option.label }}</option>
              }
            </select>
          </label>

          @if (createError(); as message) {
            <p class="text-sm text-danger" role="alert">{{ message }}</p>
          }

          <button
            type="submit"
            class="cf-focus-ring w-fit rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
            [disabled]="createForm.invalid || creating()"
          >
            {{ creating() ? 'Creando…' : 'Crear tablero' }}
          </button>
        </form>
      }

      @if (loading()) {
        <cf-async-state state="loading" message="Cargando tableros…" />
      } @else if (loadError()) {
        <cf-async-state
          state="error"
          message="No se pudieron cargar tus tableros."
          retryLabel="Reintentar"
          (retry)="retryLoad()"
        />
      } @else if (boards().length === 0) {
        <cf-async-state
          state="empty"
          message="Todavía no tienes tableros. Crea el primero arriba."
        />
      } @else {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          @for (board of boards(); track board.id) {
            <cf-board-card [board]="board" (boardSelected)="openBoard(board)" />
          }
        </div>
      }
    </main>
  `,
})
export default class DashboardPage {
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly boardsService = inject(BoardsService);
  private readonly router = inject(Router);

  protected readonly templateOptions = BOARD_TEMPLATE_OPTIONS;

  readonly boards = signal<BoardSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly showCreateForm = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly createForm = new FormGroup<CreateBoardForm>({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    templateKey: new FormControl(this.templateOptions[0].key, { nonNullable: true }),
  });

  constructor() {
    this.fetchBoards();
  }

  private fetchBoards(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.boardsService.list().subscribe({
      next: (result) => {
        this.boards.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  retryLoad(): void {
    this.fetchBoards();
  }

  submit(): void {
    if (this.createForm.invalid) return;

    this.creating.set(true);
    this.createError.set(null);

    this.boardsService.create(this.createForm.getRawValue()).subscribe({
      next: (board) => this.router.navigate(['/board', board.slug]),
      error: () => {
        this.creating.set(false);
        this.createError.set('No se pudo crear el tablero.');
      },
    });
  }

  openBoard(board: BoardSummaryDto): void {
    this.router.navigate(['/board', board.slug]);
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/auth/login'));
  }
}
