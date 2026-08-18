import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StickyNoteComponent } from './sticky-note.component';
import type { NoteDto } from '@collabforge/contracts';

function aNote(overrides: Partial<NoteDto> = {}): NoteDto {
  return {
    id: 'note-1',
    columnId: 'col-1',
    text: 'Hola mundo',
    position: 1,
    groupId: null,
    version: 1,
    isDiscussed: false,
    author: { userId: 'user-1', name: 'Ana', avatarColor: '#abcdef' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StickyNoteComponent', () => {
  let fixture: ComponentFixture<StickyNoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StickyNoteComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(StickyNoteComponent);
  });

  it('muestra el texto y el autor', async () => {
    fixture.componentRef.setInput('note', aNote());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Hola mundo');
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });

  it('muestra "Anónimo" cuando la autoría está oculta', async () => {
    fixture.componentRef.setInput('note', aNote({ author: null }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Anónimo');
  });

  it('emite deleteRequested al hacer click en eliminar', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canDelete', true);
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.deleteRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledWith('note-1');
  });

  it('no muestra el botón de eliminar cuando canDelete es false', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canDelete', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('no muestra el conteo de votos cuando voteCount es undefined (tally oculto)', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('voteCount', undefined);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('votos');
  });

  it('muestra 0 votos cuando voteCount es explícitamente 0 (tally visible, nadie votó)', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('voteCount', 0);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('0 votos');
  });

  it('muestra el conteo de votos cuando voteCount tiene un valor', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('voteCount', 5);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('5 votos');
  });

  it('muestra el botón de votar solo cuando canVote es true', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canVote', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Votar');

    fixture.componentRef.setInput('canVote', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Votar');
  });

  it('emite voteCast al pulsar votar', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canVote', true);
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.voteCast.subscribe(spy);
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Votar');
    button?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('muestra "Quitar voto" y emite voteRetracted solo cuando myVoteCount > 0', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canVote', true);
    fixture.componentRef.setInput('canRetract', true);
    fixture.componentRef.setInput('myVoteCount', 0);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Quitar voto');

    fixture.componentRef.setInput('myVoteCount', 1);
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.voteRetracted.subscribe(spy);
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Quitar voto');
    button?.click();

    expect(spy).toHaveBeenCalled();
  });

  it('muestra "Quitar voto" con presupuesto agotado (canVote false) mientras canRetract sea true', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canVote', false);
    fixture.componentRef.setInput('canRetract', true);
    fixture.componentRef.setInput('myVoteCount', 1);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Votar');
    expect(fixture.nativeElement.textContent).toContain('Quitar voto');
  });

  it('no muestra "Quitar voto" fuera de fase de votación (canRetract false) aunque haya voto propio', async () => {
    fixture.componentRef.setInput('note', aNote());
    fixture.componentRef.setInput('canVote', false);
    fixture.componentRef.setInput('canRetract', false);
    fixture.componentRef.setInput('myVoteCount', 1);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Quitar voto');
  });
});
