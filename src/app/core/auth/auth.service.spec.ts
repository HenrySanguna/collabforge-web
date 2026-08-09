import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../config/environment';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let httpMock: HttpTestingController;

  const session = {
    accessToken: 'access-token',
    user: { id: 'u1', email: 'ana@test.com', name: 'Ana' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('login guarda la sesión en el store', async () => {
    const result = firstValueFrom(service.login({ email: 'ana@test.com', password: 'x' }));

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(session);
    await result;

    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('access-token');
  });

  it('register guarda la sesión en el store', async () => {
    const result = firstValueFrom(
      service.register({ email: 'ana@test.com', password: 'Password123', name: 'Ana' }),
    );

    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush(session);
    await result;

    expect(store.user()).toEqual(session.user);
  });

  it('logout limpia el store', async () => {
    store.setSession('tok', session.user);

    const result = firstValueFrom(service.logout());
    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);
    await result;

    expect(store.isAuthenticated()).toBe(false);
  });

  it('dispara un único refresh HTTP ante varias llamadas concurrentes a refresh$', async () => {
    const results = [
      firstValueFrom(service.refresh$()),
      firstValueFrom(service.refresh$()),
      firstValueFrom(service.refresh$()),
    ];

    const requests = httpMock.match(`${environment.apiUrl}/auth/refresh`);
    expect(requests.length).toBe(1);
    requests[0].flush(session);

    const tokens = await Promise.all(results);
    expect(tokens).toEqual(['access-token', 'access-token', 'access-token']);
  });

  it('refresh$ dispara una nueva petición en el siguiente ciclo tras completarse', async () => {
    const first = firstValueFrom(service.refresh$());
    httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush(session);
    await expectAsync(first).toBeResolvedTo('access-token');

    const second = firstValueFrom(service.refresh$());
    httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush(session);
    await expectAsync(second).toBeResolvedTo('access-token');
  });

  it('restoreSession no falla la app si el refresh silencioso falla', async () => {
    const result = firstValueFrom(service.restoreSession());

    httpMock
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    await expectAsync(result).toBeResolvedTo(undefined);
    expect(store.isAuthenticated()).toBe(false);
  });
});
