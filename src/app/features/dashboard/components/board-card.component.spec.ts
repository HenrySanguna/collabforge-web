import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardCardComponent } from './board-card.component';
import type { BoardSummaryDto } from '../../../core/boards/models/board.models';

function aBoard(overrides: Partial<BoardSummaryDto> = {}): BoardSummaryDto {
  return {
    id: 'b1',
    slug: 'retro-abc',
    title: 'Retro 42',
    phase: 'COLLECTING',
    isArchived: false,
    myRole: 'owner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('BoardCardComponent', () => {
  let fixture: ComponentFixture<BoardCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoardCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(BoardCardComponent);
  });

  it('muestra el título y el rol del usuario', async () => {
    fixture.componentRef.setInput('board', aBoard({ title: 'Retro Sprint 42' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Retro Sprint 42');
    expect(fixture.nativeElement.textContent).toContain('Facilitador');
  });

  it('marca visualmente los tableros archivados', async () => {
    fixture.componentRef.setInput('board', aBoard({ isArchived: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Archivado');
  });

  it('emite boardSelected al hacer click', async () => {
    fixture.componentRef.setInput('board', aBoard());
    await fixture.whenStable();

    const spy = jasmine.createSpy();
    fixture.componentInstance.boardSelected.subscribe(spy);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalled();
  });
});
