import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CursorLayerComponent,
  denormalizeCursorPosition,
  normalizeCursorPosition,
} from './cursor-layer.component';
import type { ParticipantDto } from '@collabforge/contracts';

function aParticipant(overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    userId: 'user-1',
    name: 'Ana',
    avatarColor: '#abcdef',
    role: 'member',
    isOnline: true,
    ...overrides,
  };
}

describe('normalizeCursorPosition', () => {
  it('convierte coordenadas de cliente a un rango 0-1 relativo al rect', () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };
    expect(normalizeCursorPosition(200, 100, rect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('recorta valores fuera de los límites del rect a 0-1', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    expect(normalizeCursorPosition(-50, 500, rect)).toEqual({ x: 0, y: 1 });
  });

  it('devuelve 0 cuando el rect no tiene tamaño', () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(normalizeCursorPosition(10, 10, rect)).toEqual({ x: 0, y: 0 });
  });
});

describe('denormalizeCursorPosition', () => {
  it('convierte coordenadas normalizadas a píxeles según el tamaño dado', () => {
    expect(denormalizeCursorPosition({ x: 0.5, y: 0.25 }, { width: 200, height: 400 })).toEqual({
      x: 100,
      y: 100,
    });
  });
});

describe('CursorLayerComponent', () => {
  let fixture: ComponentFixture<CursorLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursorLayerComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(CursorLayerComponent);
  });

  async function setInputs(
    cursors: Record<string, { x: number; y: number }>,
    participants: ParticipantDto[],
    selfUserId: string | null,
  ): Promise<void> {
    fixture.componentRef.setInput('cursors', cursors);
    fixture.componentRef.setInput('participants', participants);
    fixture.componentRef.setInput('selfUserId', selfUserId);
    await fixture.whenStable();
  }

  it('excluye el cursor propio', async () => {
    await setInputs(
      { 'user-1': { x: 0.1, y: 0.1 }, 'user-2': { x: 0.2, y: 0.2 } },
      [aParticipant({ userId: 'user-1' }), aParticipant({ userId: 'user-2', name: 'Beto' })],
      'user-1',
    );

    expect(fixture.componentInstance.cursorEntries().map((e) => e.userId)).toEqual(['user-2']);
    expect(fixture.nativeElement.textContent).toContain('Beto');
    expect(fixture.nativeElement.textContent).not.toContain('Ana');
  });

  it('resuelve nombre y color desde participants para cada cursor remoto', async () => {
    await setInputs(
      { 'user-2': { x: 0, y: 0 } },
      [aParticipant({ userId: 'user-2', name: 'Beto', avatarColor: '#123456' })],
      null,
    );

    const [entry] = fixture.componentInstance.cursorEntries();
    expect(entry.name).toBe('Beto');
    expect(entry.avatarColor).toBe('#123456');
  });

  it('no renderiza nada cuando no hay cursores remotos', async () => {
    await setInputs({}, [], null);
    expect(fixture.componentInstance.cursorEntries().length).toBe(0);
  });
});

@Component({
  selector: 'cf-cursor-layer-harness',
  standalone: true,
  imports: [CursorLayerComponent],
  template: `
    <div style="position: relative; width: 200px; height: 200px;">
      <button type="button" style="position: absolute; inset: 0;">nota</button>
      <cf-cursor-layer
        [cursors]="{}"
        [participants]="[]"
        [selfUserId]="null"
        (cursorMove)="onMove($event)"
      />
    </div>
  `,
})
class CursorLayerHarnessComponent {
  moved: { x: number; y: number } | null = null;

  onMove(position: { x: number; y: number }): void {
    this.moved = position;
  }
}

describe('CursorLayerComponent superpuesto sobre contenido clicable', () => {
  let hostFixture: ComponentFixture<CursorLayerHarnessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CursorLayerHarnessComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    hostFixture = TestBed.createComponent(CursorLayerHarnessComponent);
    document.body.appendChild(hostFixture.nativeElement);
    await hostFixture.whenStable();
  });

  afterEach(() => {
    document.body.removeChild(hostFixture.nativeElement);
  });

  it('deja pasar los clicks al elemento de abajo pese a la capa de cursores encima', () => {
    const button = hostFixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const rect = button.getBoundingClientRect();

    const elementAtCenter = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );

    expect(elementAtCenter).toBe(button);
  });

  it('sigue capturando mousemove en el contenedor padre y emite coordenadas normalizadas', () => {
    const wrapper = hostFixture.nativeElement.querySelector('div') as HTMLDivElement;
    const rect = wrapper.getBoundingClientRect();

    wrapper.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      }),
    );

    expect(hostFixture.componentInstance.moved).toEqual({ x: 0.5, y: 0.5 });
  });
});
