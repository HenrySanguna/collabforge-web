import { Injectable, computed, signal } from '@angular/core';
import type { AuthUser } from './models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _accessToken = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  setSession(token: string, user: AuthUser): void {
    this._accessToken.set(token);
    this._user.set(user);
  }

  setAccessToken(token: string): void {
    this._accessToken.set(token);
  }

  clear(): void {
    this._accessToken.set(null);
    this._user.set(null);
  }
}
