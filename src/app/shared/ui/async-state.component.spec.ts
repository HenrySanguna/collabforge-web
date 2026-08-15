import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsyncStateComponent } from './async-state.component';

describe('AsyncStateComponent', () => {
  let fixture: ComponentFixture<AsyncStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncStateComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(AsyncStateComponent);
  });

  async function setInputs(inputs: {
    state: 'loading' | 'empty' | 'error';
    message?: string;
    retryLabel?: string;
  }): Promise<void> {
    fixture.componentRef.setInput('state', inputs.state);
    if (inputs.message !== undefined) {
      fixture.componentRef.setInput('message', inputs.message);
    }
    if (inputs.retryLabel !== undefined) {
      fixture.componentRef.setInput('retryLabel', inputs.retryLabel);
    }
    await fixture.whenStable();
  }

  it('estado "loading" usa role="status" y el mensaje por defecto', async () => {
    await setInputs({ state: 'loading' });

    const el: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('Cargando…');
  });

  it('estado "empty" usa role="status" con un mensaje distinto al de loading', async () => {
    await setInputs({ state: 'empty' });

    const el: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('No hay datos para mostrar.');
    expect(el.textContent).not.toContain('Cargando…');
  });

  it('estado "error" usa role="alert" con el mensaje por defecto', async () => {
    await setInputs({ state: 'error' });

    const el: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('Ocurrió un error.');
  });

  it('sin retryLabel, el estado "error" no renderiza botón de reintentar', async () => {
    await setInputs({ state: 'error' });

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('con retryLabel, el estado "error" renderiza el botón y emite retry al hacer click', async () => {
    await setInputs({ state: 'error', retryLabel: 'Reintentar' });

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Reintentar');

    let emitted = false;
    fixture.componentInstance.retry.subscribe(() => (emitted = true));
    btn.click();

    expect(emitted).toBe(true);
  });

  it('un message personalizado sobreescribe el mensaje por defecto', async () => {
    await setInputs({ state: 'empty', message: 'Todavía no hay notas.' });

    const el: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(el.textContent).toContain('Todavía no hay notas.');
    expect(el.textContent).not.toContain('No hay datos para mostrar.');
  });
});
