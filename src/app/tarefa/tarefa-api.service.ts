import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';

import { environment } from '../../environments/environment';
import { extrairProblemDetails } from './problem-details.util';
import { TarefaApiUrls } from './tarefa-api-urls';
import { TarefaFormDto, TarefaErro, TarefaListItem } from './tarefa.model';

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

function mapTarefaItem(raw: unknown): TarefaListItem | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o['id']);
  const nome = String(o['nome'] ?? '');
  const custo = String(o['custo'] ?? '');
  const dataLimite = String(o['dataLimite'] ?? '');
  const ordemApresentacao = Number(o['ordemApresentacao']);
  const altoCusto = Boolean(o['altoCusto']);
  if (!Number.isFinite(id) || !nome) return null;
  if (!Number.isFinite(ordemApresentacao)) return null;
  return {
    id,
    nome,
    custo,
    dataLimite,
    ordemApresentacao,
    altoCusto,
  };
}

export type OperacaoResult =
  | { ok: true }
  | { ok: false; erro: TarefaErro; mensagem?: string };

@Injectable({ providedIn: 'root' })
export class TarefaApiService {
  private readonly http = inject(HttpClient);

  private readonly lista = signal<TarefaListItem[]>([]);
  private readonly somaInterna = signal<string>('—');

  readonly tarefas = computed(() => this.lista());
  readonly somaCustos = computed(() => this.somaInterna());

  readonly apiUrl = environment.apiUrl;

  carregar(): Observable<void> {
    return this.http.get<unknown>(TarefaApiUrls.listar()).pipe(
      map((body) => {
        const o =
          body && typeof body === 'object'
            ? (body as Record<string, unknown>)
            : {};
        const raw = o['tarefas'];
        const arr = Array.isArray(raw) ? raw : [];
        const items = arr
          .map(mapTarefaItem)
          .filter((t): t is TarefaListItem => t !== null);
        this.lista.set(items);
        const soma = o['somaCustos'];
        this.somaInterna.set(
          typeof soma === 'string' && soma.length > 0 ? soma : '—',
        );
      }),
      map(() => void 0),
    );
  }

  incluir(dto: TarefaFormDto): Observable<OperacaoResult> {
    const v = this.validarDto(dto);
    if (v) return of({ ok: false, erro: v });
    return this.http.post<unknown>(TarefaApiUrls.criar(), dto).pipe(
      switchMap(() => this.carregar().pipe(map(() => ({ ok: true as const })))),
      catchError((e) => of(this.mapHttpToOperacaoResult(e))),
    );
  }

  editar(id: number, dto: TarefaFormDto): Observable<OperacaoResult> {
    const v = this.validarDto(dto);
    if (v) return of({ ok: false, erro: v });
    return this.http.put<unknown>(TarefaApiUrls.atualizar(id), dto).pipe(
      switchMap(() => this.carregar().pipe(map(() => ({ ok: true as const })))),
      catchError((e) => of(this.mapHttpToOperacaoResult(e))),
    );
  }

  excluir(id: number): Observable<void> {
    return this.http.delete(TarefaApiUrls.excluir(id)).pipe(
      switchMap(() => this.carregar()),
      catchError((e) => throwError(() => e)),
    );
  }

  subir(id: number): Observable<void> {
    return this.http.post(TarefaApiUrls.subir(id), null).pipe(
      switchMap(() => this.carregar()),
      catchError((e) => throwError(() => e)),
    );
  }

  descer(id: number): Observable<void> {
    return this.http.post(TarefaApiUrls.descer(id), null).pipe(
      switchMap(() => this.carregar()),
      catchError((e) => throwError(() => e)),
    );
  }

  definirOrdemLocal(items: TarefaListItem[]): void {
    this.lista.set([...items]);
  }

  reordenarPorArrastar(
    id: number,
    previousIndex: number,
    currentIndex: number,
  ): Observable<void> {
    if (previousIndex === currentIndex) {
      return of(void 0);
    }
    const delta = currentIndex - previousIndex;
    const steps = Math.abs(delta);
    let req: Observable<unknown> = of(null);
    for (let i = 0; i < steps; i++) {
      req = req.pipe(
        switchMap(() =>
          delta < 0
            ? this.http.post(TarefaApiUrls.subir(id), null)
            : this.http.post(TarefaApiUrls.descer(id), null),
        ),
      );
    }
    return req.pipe(
      switchMap(() => this.carregar()),
      catchError((e) =>
        this.carregar().pipe(switchMap(() => throwError(() => e))),
      ),
    );
  }

  private validarDto(dto: TarefaFormDto): TarefaErro | null {
    if (!dto.nome.trim()) return 'NOME_OBRIGATORIO';
    if (!Number.isFinite(dto.custo) || dto.custo < 0) return 'CUSTO_INVALIDO';
    if (!isValidDateIso(dto.dataLimite)) return 'DATA_INVALIDA';
    return null;
  }

  private mapHttpToOperacaoResult(err: unknown): OperacaoResult {
    const httpErr = err instanceof HttpErrorResponse ? err : null;
    if (!httpErr) {
      return { ok: false, erro: 'ERRO_SERVIDOR' };
    }
    const msg = extrairProblemDetails(httpErr.error) ?? undefined;
    if (httpErr.status === 409) {
      return { ok: false, erro: 'NOME_DUPLICADO', mensagem: msg };
    }
    if (httpErr.status === 400) {
      return { ok: false, erro: 'ERRO_SERVIDOR', mensagem: msg };
    }
    if (httpErr.status === 404) {
      return { ok: false, erro: 'ERRO_SERVIDOR', mensagem: msg };
    }
    if (httpErr.status === 0) {
      return { ok: false, erro: 'ERRO_REDE', mensagem: msg };
    }
    return { ok: false, erro: 'ERRO_SERVIDOR', mensagem: msg };
  }
}
