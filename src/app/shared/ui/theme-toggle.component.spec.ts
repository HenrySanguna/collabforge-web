import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from '../../core/theme/theme.service';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let appRef: ApplicationRef;

  beforeEach(async () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark');

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    appRef = TestBed.inject(ApplicationRef);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark');
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('renderiza un <button> nativo sin tabindex negativo (alcanzable por teclado)', () => {
    const btn = button();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('tabindex')).not.toBe('-1');
  });

  it('inicia con aria-pressed="false" en modo claro', () => {
    expect(button().getAttribute('aria-pressed')).toBe('false');
  });

  it('al hacer click cambia a aria-pressed="true" y aplica la clase dark', async () => {
    button().click();
    await fixture.whenStable();
    await appRef.whenStable();

    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('un segundo click vuelve a aria-pressed="false" y quita la clase dark', async () => {
    button().click();
    await fixture.whenStable();
    await appRef.whenStable();

    button().click();
    await fixture.whenStable();
    await appRef.whenStable();

    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
