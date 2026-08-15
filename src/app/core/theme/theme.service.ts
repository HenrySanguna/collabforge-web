import { effect, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cf-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<ThemeMode>(readStoredTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const mode = this._theme();
      document.documentElement.classList.toggle('dark', mode === 'dark');
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this._theme.set(mode);
  }
}

function readStoredTheme(): ThemeMode {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}
