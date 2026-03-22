export interface TarefaListItem {
  id: number;
  nome: string;
  custo: string;
  dataLimite: string;
  ordemApresentacao: number;
  altoCusto: boolean;
}

export interface TarefasListagemResponse {
  tarefas: TarefaListItem[];
  somaCustos: string;
}

export type TarefaFormDto = {
  nome: string;
  custo: number;
  dataLimite: string;
};

export type TarefaErro =
  | 'NOME_DUPLICADO'
  | 'NOME_OBRIGATORIO'
  | 'CUSTO_INVALIDO'
  | 'DATA_INVALIDA'
  | 'ERRO_REDE'
  | 'ERRO_SERVIDOR';
