import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page'),
  },
  {
    path: 'board/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./features/board/board.page'),
  },
  {
    path: 'invite/:token',
    loadComponent: () => import('./features/invite/accept-invite.page'),
  },
  { path: '**', redirectTo: 'auth/login' },
];
