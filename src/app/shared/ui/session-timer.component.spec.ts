import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  SessionTimerComponent,
  computeDriftMs,
  computeRemainingMs,
  formatCountdown,
} from './session-timer.component';

describe('computeDriftMs / computeRemainingMs / formatCountdown', () => {
  it('calcula drift cero cuando el reloj del cliente y el servidor coinciden', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    expect(computeDriftMs('2026-01-01T00:00:00.000Z', now)).toBe(0);
  });

  it('calcula un drift positivo cuando el cliente va adelantado', () => {
    const serverTime = '2026-01-01T00:00:00.000Z';
    const now = Date.parse(serverTime) + 5000;
    expect(computeDriftMs(serverTime, now)).toBe(5000);
  });

  it('corrige el tiempo restante restando el drift', () => {
    const endsAt = '2026-01-01T00:01:00.000Z';
    const driftMs = 5000;
    const now = Date.parse('2026-01-01T00:00:30.000Z') + driftMs;
    expect(computeRemainingMs(endsAt, driftMs, now)).toBe(30_000);
  });

  it('nunca devuelve un remanente negativo', () => {
    const endsAt = '2026-01-01T00:00:00.000Z';
    const now = Date.parse(endsAt) + 10_000;
    expect(computeRemainingMs(endsAt, 0, now)).toBe(0);
  });

  it('formatea mm:ss con segundos rellenados', () => {
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(5_000)).toBe('0:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('SessionTimerComponent', () => {
  let fixture: ComponentFixture<SessionTimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionTimerComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(SessionTimerComponent);
    fixture.componentRef.setInput('serverTime', new Date().toISOString());
  });

  it('no renderiza nada cuando no hay temporizador activo', async () => {
    fixture.componentRef.setInput('endsAt', null);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('muestra "Pausado" cuando paused es true, sin importar endsAt', async () => {
    fixture.componentRef.setInput('endsAt', null);
    fixture.componentRef.setInput('paused', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Pausado');
  });

  it('muestra la cuenta regresiva en formato mm:ss cuando hay endsAt', async () => {
    fixture.componentRef.setInput('endsAt', new Date(Date.now() + 90_000).toISOString());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toMatch(/\d:\d{2}/);
  });
});
