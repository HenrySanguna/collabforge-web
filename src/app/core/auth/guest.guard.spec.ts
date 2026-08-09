import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthStore } from './auth.store';

describe('guestGuard', () => {
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStore, provideZonelessChangeDetection(), provideRouter([])],
    });
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  it('permite el paso cuando no hay sesión', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirige al dashboard cuando ya hay sesión', () => {
    store.setSession('tok', { id: 'u1', email: 'ana@test.com', name: 'Ana' });

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toEqual(router.createUrlTree(['/dashboard']));
  });
});
