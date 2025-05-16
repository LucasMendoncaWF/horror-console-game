import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./game/screen/screen.component').then((m) => m.ScreenComponent),
  },
];