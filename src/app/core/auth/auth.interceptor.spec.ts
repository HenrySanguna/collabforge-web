import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../config/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let store: AuthStore;
  let authService: AuthService;

  const session = {
    accessToken: 'nuevo-token',
    user: { id: 'u1', email: 'ana@test.com', name: 'Ana' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => httpMock.verify());

  it('adjunta el access token cuando existe', () => {
    store.setSession('tok123', { id: 'u1', email: 'ana@test.com', name: 'Ana' });

    http.get('/x').subscribe();

    const req = httpMock.expectOne('/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok123');
    req.flush({});
  });

  it('no adjunta cabecera Authorization sin sesión', () => {
    http.get('/x').subscribe();

    const req = httpMock.expectOne('/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('dispara un único refresh HTTP ante varias peticiones que fallan con 401 simultáneamente', async () => {
    const refreshSpy = spyOn(authService, 'refresh$').and.callThrough();

    const requests = [http.get('/a'), http.get('/b'), http.get('/c')].map((r) => firstValueFrom(r));

    const originals = httpMock.match(() => true);
    expect(originals.length).toBe(3);
    originals.forEach((req) => req.flush({}, { status: 401, statusText: 'Unauthorized' }));

    // las 3 catchError disparan auth.refresh$(), pero solo debe salir UNA petición HTTP real
    const refreshRequests = httpMock.match(`${environment.apiUrl}/auth/refresh`);
    expect(refreshRequests.length).toBe(1);
    refreshRequests[0].flush(session);

    const retries = httpMock.match(() => true);
    expect(retries.length).toBe(3);
    retries.forEach((req) => {
      expect(req.request.headers.get('Authorization')).toBe('Bearer nuevo-token');
      req.flush({ ok: true });
    });

    await Promise.all(requests);

    expect(refreshSpy).toHaveBeenCalledTimes(3);
  });

  it('propaga el error si la petición al propio endpoint de refresh falla con 401', async () => {
    const refreshSpy = spyOn(authService, 'refresh$');
    const promise = firstValueFrom(http.post(`${environment.apiUrl}/auth/refresh`, {})).catch(
      (e: unknown) => e,
    );

    httpMock
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await promise;
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
