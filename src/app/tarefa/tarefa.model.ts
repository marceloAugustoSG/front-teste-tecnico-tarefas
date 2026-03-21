export interface Tarefa {
  id: number;
  nome: string;
  custo: number;
  dataLimite: string;
  ordem: number;
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
  | 'DATA_INVALIDA';
