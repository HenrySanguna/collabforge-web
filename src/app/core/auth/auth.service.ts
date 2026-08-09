import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../config/environment';
import { AuthStore } from './auth.store';
import type { AuthSession, LoginPayload, RegisterPayload } from './models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);

  private refreshInFlight$: Observable<string> | null = null;

  register(payload: RegisterPayload): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${environment.apiUrl}/auth/register`, payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.store.setSession(session.accessToken, session.user)));
  }

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http
      .post<AuthSession>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true })
      .pipe(tap((session) => this.store.setSession(session.accessToken, session.user)));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.store.clear()));
  }

  /** Un único refresh compartido: N llamadas concurrentes disparan una sola petición HTTP. */
  refresh$(): Observable<string> {
    this.refreshInFlight$ ??= this.http
      .post<AuthSession>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((session) => this.store.setSession(session.accessToken, session.user)),
        map((session) => session.accessToken),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    return this.refreshInFlight$;
  }

  /** Refresh silencioso al arrancar la aplicación (ver provideAppInitializer). */
  restoreSession(): Observable<void> {
    return this.refresh$().pipe(
      map(() => void 0),
      catchError(() => {
        this.store.clear();
        return of(void 0);
      }),
    );
  }
}
