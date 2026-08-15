import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { environment } from '../../core/config/environment';
import { BoardRealtimeFacade } from '../../core/boards/board-realtime.facade';
import type { CursorPosition } from '../../core/boards/board-realtime.facade';
import type { ConnectionState } from '../../core/realtime/realtime.service';
import { BoardStore } from '../../core/boards/board.store';
import BoardPage from './board.page';

function activatedRouteStub(slug: string) {
  return {
    snapshot: { paramMap: convertToParamMap({ slug }) },
  };
}

function aBoardResponse(overrides: object = {}) {
  return {
    id: 'b1',
    slug: 'retro-abc',
    title: 'Retro 42',
    phase: 'COLLECTING',
    isArchived: false,
    myRole: 'owner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ownerId: 'user-1',
    revealed: false,
    voteBudget: 3,
    allowMultiVote: false,
    liveTally: false,
    columns: [{ id: 'c1', title: 'Start', color: '#86efac', position: 0 }],
    ...overrides,
  };
}

describe('BoardPage', () => {
  let fixture: ComponentFixture<BoardPage>;
  let httpMock: HttpTestingController;
  let realtimeFacade: jasmine.SpyObj<
    Pick<
      BoardRealtimeFacade,
      | 'connect'
      | 'disconnect'
      | 'createNote'
      | 'deleteNote'
      | 'sendCursor'
      | 'createActionItem'
      | 'updateActionItem'
      | 'deleteActionItem'
    >
  >;

  async function setup(slug = 'retro-abc') {
    realtimeFacade = jasmine.createSpyObj('BoardRealtimeFacade', [
      'connect',
      'disconnect',
      'createNote',
      'deleteNote',
      'sendCursor',
      'createActionItem',
      'updateActionItem',
      'deleteActionItem',
    ]);
    (realtimeFacade as unknown as { connectionState: () => ConnectionState }).connectionState =
      signal<ConnectionState>('connected');
    (realtimeFacade as unknown as { cursors: () => Record<string, CursorPosition> }).cursors =
      signal<Record<string, CursorPosition>>({});
    (realtimeFacade as unknown as { kicked: () => boolean }).kicked = signal(false);

    await TestBed.configureTestingModule({
      imports: [BoardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub(slug) },
        { provide: BoardRealtimeFacade, useValue: realtimeFacade },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BoardPage);
  }

  afterEach(() => httpMock.verify());

  it('carga el detalle del tablero por slug y conecta el realtime', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    expect(fixture.componentInstance.board()?.title).toBe('Retro 42');
    expect(fixture.nativeElement.textContent).toContain('Start');
    expect(realtimeFacade.connect).toHaveBeenCalledWith('b1');
  });

  it('genera un enlace de invitación', async () => {
    await setup('retro-abc');
    httpMock
      .expectOne(`${environment.apiUrl}/boards/retro-abc`)
      .flush(aBoardResponse({ columns: [] }));
    await fixture.whenStable();

    fixture.componentInstance.generateInvite();
    httpMock
      .expectOne(`${environment.apiUrl}/boards/b1/invite`)
      .flush({ token: 'raw-token', expiresAt: 'x' });
    await fixture.whenStable();

    expect(fixture.componentInstance.inviteLink()).toContain('/invite/raw-token');
  });

  it('crea una nota delegando en el facade de tiempo real', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    fixture.componentInstance.createNote('c1', 'Hola');
    expect(realtimeFacade.createNote).toHaveBeenCalledWith('c1', 'Hola');
  });

  it('createActionItem delega en el facade con texto y assigneeId', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    fixture.componentInstance.createActionItem({ text: 'Seguir con X', assigneeId: 'user-2' });
    expect(realtimeFacade.createActionItem).toHaveBeenCalledWith('Seguir con X', 'user-2');
  });

  it('updateActionItemStatus delega en el facade con id y status', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    fixture.componentInstance.updateActionItemStatus({ id: 'item-1', status: 'done' });
    expect(realtimeFacade.updateActionItem).toHaveBeenCalledWith({ id: 'item-1', status: 'done' });
  });

  it('deleteActionItem delega en el facade con el id', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    fixture.componentInstance.deleteActionItem('item-1');
    expect(realtimeFacade.deleteActionItem).toHaveBeenCalledWith('item-1');
  });

  it('exportMarkdown arma el markdown desde el store y dispara la descarga', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:fake-url');
    spyOn(URL, 'revokeObjectURL');
    const clickSpy = jasmine.createSpy('click');
    const anchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement;
    spyOn(document, 'createElement').and.returnValue(anchor);

    fixture.componentInstance.exportMarkdown();

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchor.download).toBe('retro-abc-' + new Date().toISOString().slice(0, 10) + '.md');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('difiere el panel de action items hasta que la fase es DISCUSSING', async () => {
    await setup('retro-abc');
    httpMock
      .expectOne(`${environment.apiUrl}/boards/retro-abc`)
      .flush(aBoardResponse({ phase: 'COLLECTING' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('cf-action-items-panel')).toBeNull();

    TestBed.inject(BoardStore).setPhase('DISCUSSING', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('cf-action-items-panel')).not.toBeNull();
  });

  it('muestra un estado de carga accesible mientras llega el tablero', async () => {
    await setup('retro-abc');
    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Cargando tablero');

    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
  });

  it('muestra un error accesible con reintento cuando falla la carga, y el reintento recupera el tablero', async () => {
    await setup('retro-abc');
    httpMock
      .expectOne(`${environment.apiUrl}/boards/retro-abc`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo cargar el tablero.');

    const retryButton = alert?.querySelector('button') as HTMLButtonElement;
    expect(retryButton?.textContent?.trim()).toBe('Reintentar');

    retryButton.click();
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush(aBoardResponse());
    await fixture.whenStable();

    expect(fixture.componentInstance.board()?.title).toBe('Retro 42');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
