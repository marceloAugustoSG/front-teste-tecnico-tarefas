import { environment } from '../../environments/environment';

function base(): string {
  return environment.apiUrl.replace(/\/$/, '');
}

export const TarefaApiUrls = {
  listar: () => `${base()}/api/tarefas`,
  criar: () => `${base()}/api/tarefas`,
  atualizar: (id: number) => `${base()}/api/tarefas/${id}`,
  excluir: (id: number) => `${base()}/api/tarefas/${id}`,
  subir: (id: number) => `${base()}/api/tarefas/${id}/subir`,
  descer: (id: number) => `${base()}/api/tarefas/${id}/descer`,
} as const;
