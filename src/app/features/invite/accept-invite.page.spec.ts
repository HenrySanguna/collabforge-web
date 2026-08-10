import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { environment } from '../../core/config/environment';
import { AuthStore } from '../../core/auth/auth.store';
import AcceptInvitePage from './accept-invite.page';

function activatedRouteStub(token: string) {
  return { snapshot: { paramMap: convertToParamMap({ token }) } };
}

describe('AcceptInvitePage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  async function setup(token = 'raw-token') {
    await TestBed.configureTestingModule({
      imports: [AcceptInvitePage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: activatedRouteStub(token) },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  }

  afterEach(() => httpMock.verify());

  it('acepta la invitación y navega al tablero cuando el usuario ya está autenticado', async () => {
    await setup('raw-token');
    const store = TestBed.inject(AuthStore);
    store.setSession('tok', { id: 'u1', email: 'ana@test.com', name: 'Ana' });
    const navigateSpy = spyOn(router, 'navigate');

    const fixture: ComponentFixture<AcceptInvitePage> = TestBed.createComponent(AcceptInvitePage);
    httpMock
      .expectOne(`${environment.apiUrl}/invitations/accept`)
      .flush({ id: 'b1', slug: 'retro-abc' });
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/board', 'retro-abc']);
  });

  it('redirige a login con returnUrl cuando no hay sesión', async () => {
    await setup('raw-token');
    const navigateSpy = spyOn(router, 'navigate');

    TestBed.createComponent(AcceptInvitePage);

    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/invite/raw-token' },
    });
    httpMock.expectNone(`${environment.apiUrl}/invitations/accept`);
  });

  it('muestra un error si el enlace ya no es válido', async () => {
    await setup('raw-token');
    const store = TestBed.inject(AuthStore);
    store.setSession('tok', { id: 'u1', email: 'ana@test.com', name: 'Ana' });

    const fixture: ComponentFixture<AcceptInvitePage> = TestBed.createComponent(AcceptInvitePage);
    httpMock
      .expectOne(`${environment.apiUrl}/invitations/accept`)
      .flush({}, { status: 410, statusText: 'Gone' });
    await fixture.whenStable();

    expect(fixture.componentInstance.error()).toContain('no es válido');
  });
});
