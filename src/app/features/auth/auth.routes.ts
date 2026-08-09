import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guest.guard';

export default [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login.page'),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./register.page'),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
] satisfies Routes;
