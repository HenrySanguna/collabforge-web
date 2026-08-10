import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../core/config/environment';
import { AuthStore } from '../../core/auth/auth.store';
import DashboardPage from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    const store = TestBed.inject(AuthStore);
    store.setSession('tok', { id: 'u1', email: 'ana@test.com', name: 'Ana' });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(DashboardPage);
  });

  afterEach(() => httpMock.verify());

  it('carga y muestra los tableros del usuario', async () => {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/boards?page=1&limit=20`).flush({
      items: [
        {
          id: 'b1',
          slug: 'retro-abc',
          title: 'Retro 42',
          phase: 'COLLECTING',
          isArchived: false,
          myRole: 'owner',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.boards().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Retro 42');
  });

  it('muestra un mensaje cuando no hay tableros', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/boards?page=1&limit=20`)
      .flush({ items: [], page: 1, limit: 20, total: 0 });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no tienes tableros');
  });

  it('crea un tablero y navega a su página', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/boards?page=1&limit=20`)
      .flush({ items: [], page: 1, limit: 20, total: 0 });
    await fixture.whenStable();

    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance.showCreateForm.set(true);
    fixture.componentInstance.createForm.setValue({ title: 'Nueva retro', templateKey: 'BLANK' });
    await fixture.whenStable();

    fixture.componentInstance.submit();
    httpMock.expectOne(`${environment.apiUrl}/boards`).flush({ id: 'b2', slug: 'nueva-retro-xyz' });

    expect(navigateSpy).toHaveBeenCalledWith(['/board', 'nueva-retro-xyz']);
  });
});
