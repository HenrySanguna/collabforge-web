import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhaseControlsComponent } from './phase-controls.component';
import type { BoardPhase } from '@collabforge/contracts';

describe('PhaseControlsComponent', () => {
  let fixture: ComponentFixture<PhaseControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhaseControlsComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PhaseControlsComponent);
  });

  async function setUp(phase: BoardPhase, isOwner: boolean): Promise<void> {
    fixture.componentRef.setInput('phase', phase);
    fixture.componentRef.setInput('isOwner', isOwner);
    await fixture.whenStable();
  }

  function buttonLabels(): string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLElement>,
    ).map((b) => b.textContent?.trim() ?? '');
  }

  it('no renderiza nada para un miembro que no es owner', async () => {
    await setUp('COLLECTING', false);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('muestra solo la transición válida desde COLLECTING (→ GROUPING)', async () => {
    await setUp('COLLECTING', true);
    const labels = buttonLabels();
    expect(labels.some((l) => l.includes('Agrupación'))).toBe(true);
    expect(labels.some((l) => l.includes('Votación'))).toBe(false);
    expect(labels.some((l) => l.includes('Discusión'))).toBe(false);
  });

  it('muestra ambas transiciones válidas desde GROUPING (COLLECTING y VOTING)', async () => {
    await setUp('GROUPING', true);
    const labels = buttonLabels();
    expect(labels.some((l) => l.includes('Recolección'))).toBe(true);
    expect(labels.some((l) => l.includes('Votación'))).toBe(true);
    expect(labels.some((l) => l.includes('Discusión'))).toBe(false);
  });

  it('muestra ambas transiciones válidas desde VOTING (GROUPING y DISCUSSING)', async () => {
    await setUp('VOTING', true);
    const labels = buttonLabels();
    expect(labels.some((l) => l.includes('Agrupación'))).toBe(true);
    expect(labels.some((l) => l.includes('Discusión'))).toBe(true);
    expect(labels.some((l) => l.includes('Recolección'))).toBe(false);
  });

  it('muestra solo la transición válida desde DISCUSSING (→ VOTING)', async () => {
    await setUp('DISCUSSING', true);
    const labels = buttonLabels();
    expect(labels.some((l) => l.includes('Votación'))).toBe(true);
    expect(labels.some((l) => l.includes('Agrupación'))).toBe(false);
  });

  it('emite phaseChange con la fase destino al pulsar una transición', async () => {
    await setUp('COLLECTING', true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.phaseChange.subscribe(spy);

    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes('Agrupación'));
    button?.click();

    expect(spy).toHaveBeenCalledWith('GROUPING');
  });

  it('emite startTimer con la duración en segundos, clampeada al rango 30-3600', async () => {
    await setUp('VOTING', true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.startTimer.subscribe(spy);

    fixture.componentInstance.durationMinutes.set(120);
    fixture.componentInstance.emitStartTimer();

    expect(spy).toHaveBeenCalledWith(3600);
  });

  it('oculta el botón de revelar en DISCUSSING', async () => {
    await setUp('DISCUSSING', true);
    expect(buttonLabels().some((l) => l.includes('Revelar autoría'))).toBe(false);
  });

  it('muestra el botón de revelar fuera de DISCUSSING', async () => {
    await setUp('VOTING', true);
    expect(buttonLabels().some((l) => l.includes('Revelar autoría'))).toBe(true);
  });
});
