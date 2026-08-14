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
    Pick<BoardRealtimeFacade, 'connect' | 'disconnect' | 'createNote' | 'deleteNote' | 'sendCursor'>
  >;

  async function setup(slug = 'retro-abc') {
    realtimeFacade = jasmine.createSpyObj('BoardRealtimeFacade', [
      'connect',
      'disconnect',
      'createNote',
      'deleteNote',
      'sendCursor',
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
});
