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
});
