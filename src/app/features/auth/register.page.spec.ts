import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { environment } from '../../core/config/environment';
import RegisterPage from './register.page';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('vincula la pista de la contraseña al input via aria-describedby', () => {
    const passwordInput: HTMLInputElement =
      fixture.nativeElement.querySelector('input[type="password"]');
    const describedBy = passwordInput.getAttribute('aria-describedby');

    expect(describedBy).toBe('password-hint');
    expect(document.getElementById('password-hint')?.textContent).toContain('Mínimo 10 caracteres');
  });

  it('muestra el error de registro con role="alert" via cf-async-state', async () => {
    fixture.componentInstance.form.setValue({
      name: 'Ana',
      email: 'ana@test.com',
      password: 'Secret1234',
    });
    fixture.componentInstance.submit();

    httpMock
      .expectOne(`${environment.apiUrl}/auth/register`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudo completar el registro con estos datos.');
  });
});
