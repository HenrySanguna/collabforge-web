import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark');
  });

  describe('sin preferencia guardada', () => {
    let service: ThemeService;
    let appRef: ApplicationRef;

    beforeEach(() => {
      localStorage.removeItem(THEME_STORAGE_KEY);
      document.documentElement.classList.remove('dark');
      TestBed.configureTestingModule({
        providers: [ThemeService, provideZonelessChangeDetection()],
      });
      service = TestBed.inject(ThemeService);
      appRef = TestBed.inject(ApplicationRef);
    });

    it('inicia en "light" por defecto', () => {
      expect(service.theme()).toBe('light');
    });

    it('toggle() pasa de "light" a "dark" y aplica la clase + persiste', async () => {
      service.toggle();

      expect(service.theme()).toBe('dark');
      await appRef.whenStable();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('toggle() dos veces vuelve a "light" y quita la clase', async () => {
      service.toggle();
      await appRef.whenStable();

      service.toggle();
      await appRef.whenStable();

      expect(service.theme()).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('setTheme("dark") fija el modo explícitamente', async () => {
      service.setTheme('dark');

      expect(service.theme()).toBe('dark');
      await appRef.whenStable();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('con preferencia "dark" ya guardada', () => {
    it('lee "dark" desde localStorage al inicializar', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      TestBed.configureTestingModule({
        providers: [ThemeService, provideZonelessChangeDetection()],
      });
      const service = TestBed.inject(ThemeService);

      expect(service.theme()).toBe('dark');
    });
  });

  describe('con un valor inválido guardado', () => {
    it('ignora el valor y cae a "light"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'purple');

      TestBed.configureTestingModule({
        providers: [ThemeService, provideZonelessChangeDetection()],
      });
      const service = TestBed.inject(ThemeService);

      expect(service.theme()).toBe('light');
    });
  });
});
