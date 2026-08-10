import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../config/environment';
import { BoardsService } from './boards.service';

describe('BoardsService', () => {
  let service: BoardsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(BoardsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('create hace POST a /boards con el payload', async () => {
    const result = firstValueFrom(service.create({ title: 'Retro', templateKey: 'BLANK' }));
    const req = httpMock.expectOne(`${environment.apiUrl}/boards`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Retro', templateKey: 'BLANK' });
    req.flush({ id: 'b1', slug: 'retro-abc' });
    await result;
  });

  it('list envía page/limit como query params', async () => {
    const result = firstValueFrom(service.list(2, 10));
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/boards` &&
        r.params.get('page') === '2' &&
        r.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], page: 2, limit: 10, total: 0 });
    await result;
  });

  it('bySlug hace GET a /boards/:slug', async () => {
    const result = firstValueFrom(service.bySlug('retro-abc'));
    const req = httpMock.expectOne(`${environment.apiUrl}/boards/retro-abc`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'b1' });
    await result;
  });

  it('archive hace PATCH a /boards/:id/archive', async () => {
    const result = firstValueFrom(service.archive('b1'));
    const req = httpMock.expectOne(`${environment.apiUrl}/boards/b1/archive`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: 'b1', isArchived: true });
    await result;
  });

  it('createInvite hace POST a /boards/:id/invite', async () => {
    const result = firstValueFrom(service.createInvite('b1'));
    const req = httpMock.expectOne(`${environment.apiUrl}/boards/b1/invite`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: 't', expiresAt: 'x' });
    await result;
  });

  it('revokeInvite hace DELETE a /boards/:id/invite', async () => {
    const result = firstValueFrom(service.revokeInvite('b1'));
    const req = httpMock.expectOne(`${environment.apiUrl}/boards/b1/invite`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await result;
  });

  it('acceptInvite hace POST a /invitations/accept con el token', async () => {
    const result = firstValueFrom(service.acceptInvite('raw-token'));
    const req = httpMock.expectOne(`${environment.apiUrl}/invitations/accept`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'raw-token' });
    req.flush({ id: 'b1' });
    await result;
  });
});
