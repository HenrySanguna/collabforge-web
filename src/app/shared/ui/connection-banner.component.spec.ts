import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectionBannerComponent } from './connection-banner.component';
import type { ConnectionState } from '../../core/realtime/realtime.service';

describe('ConnectionBannerComponent', () => {
  let fixture: ComponentFixture<ConnectionBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionBannerComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ConnectionBannerComponent);
  });

  async function setState(state: ConnectionState): Promise<void> {
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
  }

  it('no muestra nada cuando está conectado', async () => {
    await setState('connected');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('no muestra nada en estado idle', async () => {
    await setState('idle');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('muestra "Conectando…" mientras conecta', async () => {
    await setState('connecting');
    expect(fixture.nativeElement.textContent).toContain('Conectando…');
  });

  it('muestra "Reconectando…" mientras reconecta', async () => {
    await setState('reconnecting');
    expect(fixture.nativeElement.textContent).toContain('Reconectando…');
  });

  it('muestra "Sin conexión" cuando está desconectado', async () => {
    await setState('disconnected');
    expect(fixture.nativeElement.textContent).toContain('Sin conexión');
  });
});
