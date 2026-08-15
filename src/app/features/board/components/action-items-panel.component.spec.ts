import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionItemsPanelComponent } from './action-items-panel.component';
import type { ActionItemDto, ParticipantDto } from '@collabforge/contracts';

function anActionItem(overrides: Partial<ActionItemDto> = {}): ActionItemDto {
  return {
    id: 'item-1',
    text: 'Seguir con X',
    assigneeId: null,
    status: 'open',
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function aParticipant(overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    userId: 'user-2',
    name: 'Beto',
    avatarColor: '#000',
    role: 'member',
    isOnline: true,
    ...overrides,
  };
}

describe('ActionItemsPanelComponent', () => {
  let fixture: ComponentFixture<ActionItemsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionItemsPanelComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionItemsPanelComponent);
    fixture.componentRef.setInput('actionItems', []);
    fixture.componentRef.setInput('participants', []);
    fixture.componentRef.setInput('isOwner', false);
    fixture.componentRef.setInput('phase', 'DISCUSSING');
  });

  it('no renderiza nada fuera de la fase DISCUSSING', async () => {
    fixture.componentRef.setInput('phase', 'VOTING');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('muestra la lista en DISCUSSING aunque el usuario no sea owner', async () => {
    fixture.componentRef.setInput('actionItems', [anActionItem()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Seguir con X');
  });

  it('no muestra el formulario de creación si no es owner', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('muestra el formulario de creación si es owner', async () => {
    fixture.componentRef.setInput('isOwner', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('no muestra los controles de completar/eliminar si no es owner', async () => {
    fixture.componentRef.setInput('actionItems', [anActionItem()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  it('muestra los controles de completar/eliminar si es owner', async () => {
    fixture.componentRef.setInput('isOwner', true);
    fixture.componentRef.setInput('actionItems', [anActionItem()]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('button').length).toBeGreaterThanOrEqual(2);
  });

  it('emite itemCreated con el texto y assigneeId, y limpia el formulario', () => {
    fixture.componentRef.setInput('isOwner', true);
    const spy = jasmine.createSpy();
    fixture.componentInstance.itemCreated.subscribe(spy);

    fixture.componentInstance.draftText.setValue('Nuevo item');
    fixture.componentInstance.draftAssigneeId.setValue('user-2');
    fixture.componentInstance.submitCreate();

    expect(spy).toHaveBeenCalledWith({ text: 'Nuevo item', assigneeId: 'user-2' });
    expect(fixture.componentInstance.draftText.value).toBe('');
  });

  it('no emite itemCreated si el texto está vacío', () => {
    const spy = jasmine.createSpy();
    fixture.componentInstance.itemCreated.subscribe(spy);

    fixture.componentInstance.draftText.setValue('   ');
    fixture.componentInstance.submitCreate();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emite null como assigneeId cuando no se elige ninguno', () => {
    const spy = jasmine.createSpy();
    fixture.componentInstance.itemCreated.subscribe(spy);

    fixture.componentInstance.draftText.setValue('Nuevo item');
    fixture.componentInstance.submitCreate();

    expect(spy).toHaveBeenCalledWith({ text: 'Nuevo item', assigneeId: null });
  });

  it('toggleStatus emite itemStatusToggled con el status invertido', () => {
    const spy = jasmine.createSpy();
    fixture.componentInstance.itemStatusToggled.subscribe(spy);

    fixture.componentInstance.toggleStatus(anActionItem({ status: 'open' }));
    expect(spy).toHaveBeenCalledWith({ id: 'item-1', status: 'done' });

    fixture.componentInstance.toggleStatus(anActionItem({ status: 'done' }));
    expect(spy).toHaveBeenCalledWith({ id: 'item-1', status: 'open' });
  });

  it('remove emite itemDeleted con el id', () => {
    const spy = jasmine.createSpy();
    fixture.componentInstance.itemDeleted.subscribe(spy);

    fixture.componentInstance.remove('item-1');

    expect(spy).toHaveBeenCalledWith('item-1');
  });

  it('muestra un mensaje cuando no hay action items', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sin action items todavía');
  });

  it('resuelve el nombre del asignado desde participants', () => {
    fixture.componentRef.setInput('participants', [
      aParticipant({ userId: 'user-2', name: 'Beto' }),
    ]);
    expect(fixture.componentInstance.assigneeName('user-2')).toBe('Beto');
    expect(fixture.componentInstance.assigneeName(null)).toBe('Sin asignar');
    expect(fixture.componentInstance.assigneeName('user-desconocido')).toBe('Sin asignar');
  });
});
