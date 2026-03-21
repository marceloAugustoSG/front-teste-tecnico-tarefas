import { Routes } from '@angular/router';

import { TarefaListComponent } from './tarefa/tarefa-list.component';

export const routes: Routes = [
  { path: '', component: TarefaListComponent },
  { path: '**', redirectTo: '' },
];
