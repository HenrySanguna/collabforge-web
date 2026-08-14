import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoteBudgetComponent } from './vote-budget.component';

describe('VoteBudgetComponent', () => {
  let fixture: ComponentFixture<VoteBudgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoteBudgetComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(VoteBudgetComponent);
  });

  it('muestra el texto "X de Y votos usados"', async () => {
    fixture.componentRef.setInput('budget', 3);
    fixture.componentRef.setInput('spent', 2);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('2 de 3 votos usados');
  });

  it('renderiza un pip por cada voto del presupuesto', async () => {
    fixture.componentRef.setInput('budget', 4);
    fixture.componentRef.setInput('spent', 1);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('span.flex > span').length).toBe(4);
  });

  it('marca como usados solo los pips correspondientes a spent', async () => {
    fixture.componentRef.setInput('budget', 3);
    fixture.componentRef.setInput('spent', 2);
    await fixture.whenStable();

    const pips = fixture.nativeElement.querySelectorAll(
      'span.flex > span',
    ) as NodeListOf<HTMLElement>;
    expect(pips[0].classList.contains('bg-neutral-700')).toBe(true);
    expect(pips[1].classList.contains('bg-neutral-700')).toBe(true);
    expect(pips[2].classList.contains('bg-neutral-200')).toBe(true);
  });
});
