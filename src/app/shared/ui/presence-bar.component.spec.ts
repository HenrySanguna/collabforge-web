import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PresenceBarComponent } from './presence-bar.component';
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

describe('PresenceBarComponent', () => {
  let fixture: ComponentFixture<PresenceBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresenceBarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PresenceBarComponent);
    fixture.componentRef.setInput('selfUserId', null);
  });

  it('renderiza un avatar por participante', async () => {
    fixture.componentRef.setInput('participants', [
      aParticipant(),
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('span[title]').length).toBe(2);
  });

  it('no renderiza avatares cuando no hay participantes', async () => {
    fixture.componentRef.setInput('participants', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('span[title]').length).toBe(0);
  });

  it('muestra la inicial del nombre en mayúscula', async () => {
    fixture.componentRef.setInput('participants', [aParticipant({ name: 'beto' })]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('B');
  });

  it('ordena al usuario propio primero', async () => {
    fixture.componentRef.setInput('selfUserId', 'user-2');
    fixture.componentRef.setInput('participants', [
      aParticipant({ userId: 'user-1', name: 'Ana' }),
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    await fixture.whenStable();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('span[title]') as NodeListOf<HTMLElement>,
    ).map((el) => el.getAttribute('title'));
    expect(titles[0]).toContain('Beto');
  });

  it('no muestra botón de expulsar cuando isOwner es false', async () => {
    fixture.componentRef.setInput('selfUserId', 'user-1');
    fixture.componentRef.setInput('isOwner', false);
    fixture.componentRef.setInput('participants', [
      aParticipant({ userId: 'user-1', name: 'Ana' }),
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('muestra botón de expulsar solo sobre otros participantes cuando isOwner es true', async () => {
    fixture.componentRef.setInput('selfUserId', 'user-1');
    fixture.componentRef.setInput('isOwner', true);
    fixture.componentRef.setInput('participants', [
      aParticipant({ userId: 'user-1', name: 'Ana' }),
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect((buttons[0] as HTMLElement).getAttribute('aria-label')).toBe('Expulsar a Beto');
  });

  it('emite kickRequested con el userId al hacer click en expulsar', async () => {
    fixture.componentRef.setInput('selfUserId', 'user-1');
    fixture.componentRef.setInput('isOwner', true);
    fixture.componentRef.setInput('participants', [
      aParticipant({ userId: 'user-1', name: 'Ana' }),
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.kickRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledWith('user-2');
  });
});
