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
});
