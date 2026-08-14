import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardColumnComponent } from './board-column.component';
import type { ColumnDto, NoteDto } from '@collabforge/contracts';

function aColumn(overrides: Partial<ColumnDto> = {}): ColumnDto {
  return { id: 'col-1', title: 'Start', color: '#86efac', position: 0, ...overrides };
}

function aNote(overrides: Partial<NoteDto> = {}): NoteDto {
  return {
    id: 'note-1',
    columnId: 'col-1',
    text: 'Hola',
    position: 1,
    groupId: null,
    version: 1,
    isDiscussed: false,
    author: { userId: 'user-1', name: 'Ana', avatarColor: '#abcdef' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('BoardColumnComponent', () => {
  let fixture: ComponentFixture<BoardColumnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardColumnComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(BoardColumnComponent);
    fixture.componentRef.setInput('column', aColumn());
    fixture.componentRef.setInput('notes', []);
  });

  it('muestra el título de la columna y un mensaje cuando no hay notas', async () => {
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Start');
    expect(fixture.nativeElement.textContent).toContain('Sin notas todavía');
  });

  it('renderiza una nota por cada elemento de notes', async () => {
    fixture.componentRef.setInput('notes', [aNote(), aNote({ id: 'note-2' })]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('cf-sticky-note').length).toBe(2);
  });

  it('no muestra el formulario de creación cuando canCreate es false', async () => {
    fixture.componentRef.setInput('canCreate', false);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('emite noteCreated con el texto y limpia el formulario', async () => {
    fixture.componentRef.setInput('canCreate', true);
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.noteCreated.subscribe(spy);
    fixture.componentInstance.draft.setValue('Nueva nota');

    fixture.componentInstance.submit();

    expect(spy).toHaveBeenCalledWith('Nueva nota');
    expect(fixture.componentInstance.draft.value).toBe('');
  });

  it('no emite noteCreated si el texto está vacío', () => {
    const spy = jasmine.createSpy();
    fixture.componentInstance.noteCreated.subscribe(spy);
    fixture.componentInstance.draft.setValue('   ');

    fixture.componentInstance.submit();

    expect(spy).not.toHaveBeenCalled();
  });

  it('canDelete permite al autor y al owner, no a un miembro cualquiera', () => {
    fixture.componentRef.setInput('myUserId', 'user-1');
    fixture.componentRef.setInput('myRole', 'member');
    expect(
      fixture.componentInstance.canDelete(
        aNote({ author: { userId: 'user-1', name: 'Ana', avatarColor: '#fff' } }),
      ),
    ).toBe(true);

    fixture.componentRef.setInput('myUserId', 'user-2');
    expect(
      fixture.componentInstance.canDelete(
        aNote({ author: { userId: 'user-1', name: 'Ana', avatarColor: '#fff' } }),
      ),
    ).toBe(false);

    fixture.componentRef.setInput('myRole', 'owner');
    expect(
      fixture.componentInstance.canDelete(
        aNote({ author: { userId: 'user-1', name: 'Ana', avatarColor: '#fff' } }),
      ),
    ).toBe(true);
  });

  it('canDelete respeta la fase: permitido en COLLECTING/GROUPING, bloqueado en VOTING/DISCUSSING', () => {
    fixture.componentRef.setInput('myRole', 'owner');
    const note = aNote();

    fixture.componentRef.setInput('phase', 'COLLECTING');
    expect(fixture.componentInstance.canDelete(note)).toBe(true);

    fixture.componentRef.setInput('phase', 'GROUPING');
    expect(fixture.componentInstance.canDelete(note)).toBe(true);

    fixture.componentRef.setInput('phase', 'VOTING');
    expect(fixture.componentInstance.canDelete(note)).toBe(false);

    fixture.componentRef.setInput('phase', 'DISCUSSING');
    expect(fixture.componentInstance.canDelete(note)).toBe(false);
  });

  it('pasa voteCount/myVoteCount/canVote a cada cf-sticky-note', async () => {
    fixture.componentRef.setInput('notes', [aNote()]);
    fixture.componentRef.setInput('voteTally', { 'note-1': 4 });
    fixture.componentRef.setInput('myVotes', { 'note-1': 1 });
    fixture.componentRef.setInput('canVote', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('4 votos');
    expect(fixture.nativeElement.textContent).toContain('Votar');
  });

  it('emite voteCast/voteRetracted con el noteId al reenviar los eventos de cf-sticky-note', () => {
    fixture.componentRef.setInput('notes', [aNote()]);
    fixture.componentRef.setInput('canVote', true);

    const castSpy = jasmine.createSpy();
    const retractSpy = jasmine.createSpy();
    fixture.componentInstance.voteCast.subscribe(castSpy);
    fixture.componentInstance.voteRetracted.subscribe(retractSpy);

    fixture.componentInstance.voteCast.emit('note-1');
    fixture.componentInstance.voteRetracted.emit('note-1');

    expect(castSpy).toHaveBeenCalledWith('note-1');
    expect(retractSpy).toHaveBeenCalledWith('note-1');
  });
});
