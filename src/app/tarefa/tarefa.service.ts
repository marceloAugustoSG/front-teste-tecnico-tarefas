import { Injectable, computed, signal } from '@angular/core';

import {
  Tarefa,
  TarefaErro,
  TarefaFormDto,
} from './tarefa.model';

const STORAGE_KEY = 'fatto-tarefas-spec-v1';

function normalizeNome(nome: string): string {
  return nome.trim().toLowerCase();
}

function isValidDateIso(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function load(): Tarefa[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTarefa);
  } catch {
    return [];
  }
}

function isTarefa(v: unknown): v is Tarefa {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['id'] === 'number' &&
    typeof o['nome'] === 'string' &&
    typeof o['custo'] === 'number' &&
    typeof o['dataLimite'] === 'string' &&
    typeof o['ordem'] === 'number'
  );
}

export type OperacaoResult = { ok: true } | { ok: false; erro: TarefaErro };

@Injectable({ providedIn: 'root' })
export class TarefaService {
  private readonly lista = signal<Tarefa[]>(load());

  readonly tarefas = computed(() =>
    [...this.lista()].sort((a, b) => a.ordem - b.ordem),
  );

  readonly somaCustos = computed(() =>
    this.lista().reduce((acc, t) => acc + t.custo, 0),
  );

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lista()));
  }

  private validarDto(dto: TarefaFormDto): TarefaErro | null {
    if (!dto.nome.trim()) return 'NOME_OBRIGATORIO';
    if (!Number.isFinite(dto.custo) || dto.custo <= 0) return 'CUSTO_INVALIDO';
    if (!isValidDateIso(dto.dataLimite)) return 'DATA_INVALIDA';
    return null;
  }

  private nomeDuplicado(nome: string, excetoId?: number): boolean {
    const n = normalizeNome(nome);
    return this.lista().some(
      (t) => t.id !== excetoId && normalizeNome(t.nome) === n,
    );
  }

  incluir(dto: TarefaFormDto): OperacaoResult {
    const v = this.validarDto(dto);
    if (v) return { ok: false, erro: v };
    if (this.nomeDuplicado(dto.nome)) return { ok: false, erro: 'NOME_DUPLICADO' };

    const list = this.lista();
    const maxId = list.reduce((m, t) => Math.max(m, t.id), 0);
    const maxOrdem = list.reduce((m, t) => Math.max(m, t.ordem), 0);

    this.lista.update((l) => [
      ...l,
      {
        id: maxId + 1,
        nome: dto.nome.trim(),
        custo: dto.custo,
        dataLimite: dto.dataLimite,
        ordem: maxOrdem + 1,
      },
    ]);
    this.persist();
    return { ok: true };
  }

  editar(id: number, dto: TarefaFormDto): OperacaoResult {
    const v = this.validarDto(dto);
    if (v) return { ok: false, erro: v };
    if (this.nomeDuplicado(dto.nome, id))
      return { ok: false, erro: 'NOME_DUPLICADO' };

    this.lista.update((l) =>
      l.map((t) =>
        t.id === id
          ? {
              ...t,
              nome: dto.nome.trim(),
              custo: dto.custo,
              dataLimite: dto.dataLimite,
            }
          : t,
      ),
    );
    this.persist();
    return { ok: true };
  }

  excluir(id: number): void {
    this.lista.update((l) => l.filter((t) => t.id !== id));
    this.renumerarOrdem();
    this.persist();
  }

  private renumerarOrdem(): void {
    const ordenadas = [...this.lista()].sort((a, b) => a.ordem - b.ordem);
    this.lista.set(
      ordenadas.map((t, i) => ({ ...t, ordem: i + 1 })),
    );
  }

  subir(id: number): void {
    const ordenadas = [...this.lista()].sort((a, b) => a.ordem - b.ordem);
    const i = ordenadas.findIndex((t) => t.id === id);
    if (i <= 0) return;
    this.trocarOrdem(ordenadas[i - 1], ordenadas[i]);
  }

  descer(id: number): void {
    const ordenadas = [...this.lista()].sort((a, b) => a.ordem - b.ordem);
    const i = ordenadas.findIndex((t) => t.id === id);
    if (i < 0 || i >= ordenadas.length - 1) return;
    this.trocarOrdem(ordenadas[i], ordenadas[i + 1]);
  }

  private trocarOrdem(a: Tarefa, b: Tarefa): void {
    const oa = a.ordem;
    const ob = b.ordem;
    this.lista.update((l) =>
      l.map((t) => {
        if (t.id === a.id) return { ...t, ordem: ob };
        if (t.id === b.id) return { ...t, ordem: oa };
        return t;
      }),
    );
    this.persist();
  }

  reordenar(idsNaOrdem: number[]): void {
    const map = new Map(this.lista().map((t) => [t.id, t]));
    const nova: Tarefa[] = [];
    idsNaOrdem.forEach((id, index) => {
      const t = map.get(id);
      if (t) nova.push({ ...t, ordem: index + 1 });
    });
    if (nova.length !== this.lista().length) return;
    this.lista.set(nova);
    this.persist();
  }
}
