import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { environment } from '../../core/config/environment';
import BoardPage from './board.page';

function activatedRouteStub(slug: string) {
  return {
    snapshot: { paramMap: convertToParamMap({ slug }) },
  };
}

describe('BoardPage', () => {
  let fixture: ComponentFixture<BoardPage>;
  let httpMock: HttpTestingController;

  async function setup(slug = 'retro-abc') {
    await TestBed.configureTestingModule({
      imports: [BoardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub(slug) },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BoardPage);
  }

  afterEach(() => httpMock.verify());

  it('carga el detalle del tablero por slug', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush({
      id: 'b1',
      slug: 'retro-abc',
      title: 'Retro 42',
      phase: 'COLLECTING',
      myRole: 'owner',
      columns: [{ id: 'c1', title: 'Start', color: '#86efac', position: 0 }],
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.board()?.title).toBe('Retro 42');
    expect(fixture.nativeElement.textContent).toContain('Start');
  });

  it('genera un enlace de invitación', async () => {
    await setup('retro-abc');
    httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`).flush({
      id: 'b1',
      slug: 'retro-abc',
      title: 'Retro 42',
      phase: 'COLLECTING',
      myRole: 'owner',
      columns: [],
    });
    await fixture.whenStable();

    fixture.componentInstance.generateInvite();
    httpMock
      .expectOne(`${environment.apiUrl}/boards/b1/invite`)
      .flush({ token: 'raw-token', expiresAt: 'x' });
    await fixture.whenStable();

    expect(fixture.componentInstance.inviteLink()).toContain('/invite/raw-token');
  });
});
