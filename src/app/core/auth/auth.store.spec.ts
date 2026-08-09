import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStore, provideZonelessChangeDetection()],
    });
    store = TestBed.inject(AuthStore);
  });

  it('empieza sin sesión', () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(store.accessToken()).toBeNull();
  });

  it('setSession guarda el token y el usuario', () => {
    const user = { id: 'u1', email: 'ana@test.com', name: 'Ana' };
    store.setSession('tok123', user);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()).toEqual(user);
    expect(store.accessToken()).toBe('tok123');
  });

  it('setAccessToken actualiza el token sin tocar el usuario', () => {
    const user = { id: 'u1', email: 'ana@test.com', name: 'Ana' };
    store.setSession('tok123', user);

    store.setAccessToken('tok456');

    expect(store.accessToken()).toBe('tok456');
    expect(store.user()).toEqual(user);
  });

  it('clear borra la sesión', () => {
    store.setSession('tok123', { id: 'u1', email: 'ana@test.com', name: 'Ana' });
    store.clear();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(store.accessToken()).toBeNull();
  });
});
