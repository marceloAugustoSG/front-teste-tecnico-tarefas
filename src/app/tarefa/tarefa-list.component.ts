import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  Component,
  ElementRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { mensagemErroHttp } from './problem-details.util';
import { TarefaApiService } from './tarefa-api.service';
import { TarefaErro, TarefaListItem } from './tarefa.model';

const BREAKPOINT_MOBILE = '(max-width: 52rem)';

const MSG_ERRO: Record<TarefaErro, string> = {
  CUSTO_INVALIDO:
    'Informe um custo válido (número ≥ 0), no formato brasileiro (vírgula para centavos).',
  DATA_INVALIDA: 'Informe uma data limite válida no formato DD/MM/AAAA.',
  ERRO_REDE:
    'Não foi possível contactar o servidor. Verifique a conexão e a URL da API.',
  ERRO_SERVIDOR: 'O servidor devolveu um erro. Tente novamente.',
  NOME_DUPLICADO: 'Já existe uma tarefa com este nome.',
  NOME_OBRIGATORIO: 'O nome da tarefa é obrigatório.',
};

@Component({
  selector: 'app-tarefa-list',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './tarefa-list.component.html',
  styleUrl: './tarefa-list.component.css',
})
export class TarefaListComponent implements OnInit {
  private readonly api = inject(TarefaApiService);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly erroLista = signal<string | null>(null);

  protected readonly mostraCarregando = signal(false);

  protected readonly layoutMobile = toSignal(
    this.breakpoint.observe(BREAKPOINT_MOBILE).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly tarefas = this.api.tarefas;
  protected readonly somaCustos = this.api.somaCustos;

  protected readonly formAberto = signal<'incluir' | 'editar' | null>(null);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly idExcluir = signal<number | null>(null);

  protected readonly formNome = signal('');
  protected readonly formCustoStr = signal('');
  protected readonly formDataLimite = signal('');

  protected readonly erroForm = signal<string | null>(null);

  protected readonly podeSalvarFormulario = computed(() => {
    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const data = this.formDataLimite().trim();
    if (!nome) return false;
    if (!Number.isFinite(custo) || custo < 0) return false;
    return this.dataLimiteValidaBr(data);
  });

  private readonly primeiroCampoForm = viewChild<ElementRef<HTMLInputElement>>(
    'primeiroCampoForm',
  );

  constructor() {
    effect(() => {
      if (this.formAberto() === null) return;
      setTimeout(() => this.primeiroCampoForm()?.nativeElement.focus(), 0);
    });

    effect(() => {
      const emCarregamento = this.api.carregando();
      if (!emCarregamento) {
        this.mostraCarregando.set(false);
        return;
      }

      // Evita "piscar": só mostra se a requisição demorar.
      const timer = setTimeout(() => this.mostraCarregando.set(true), 400);
      return () => clearTimeout(timer);
    });
  }

  ngOnInit(): void {
    this.recarregarLista();
  }

  protected recarregarLista(): void {
    this.erroLista.set(null);
    this.api.carregar().subscribe({
      error: (err) =>
        this.erroLista.set(
          mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
        ),
    });
  }

  protected podeSubir(t: TarefaListItem): boolean {
    const list = this.tarefas();
    const i = list.findIndex((x) => x.id === t.id);
    return i > 0;
  }

  protected podeDescer(t: TarefaListItem): boolean {
    const list = this.tarefas();
    const i = list.findIndex((x) => x.id === t.id);
    return i >= 0 && i < list.length - 1;
  }

  protected subir(t: TarefaListItem): void {
    this.api.subir(t.id).subscribe({
      error: (err) =>
        this.erroLista.set(
          mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
        ),
    });
  }

  protected descer(t: TarefaListItem): void {
    this.api.descer(t.id).subscribe({
      error: (err) =>
        this.erroLista.set(
          mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
        ),
    });
  }

  protected onDrop(event: CdkDragDrop<TarefaListItem[]>): void {
    if (this.layoutMobile()) return;
    const copia = [...this.tarefas()];
    if (
      event.previousIndex === event.currentIndex ||
      event.previousIndex < 0 ||
      event.currentIndex < 0
    ) {
      return;
    }
    const movido = copia[event.previousIndex];
    if (!movido) return;
    moveItemInArray(copia, event.previousIndex, event.currentIndex);
    this.api.definirOrdemLocal(copia);
    this.api
      .reordenarPorArrastar(movido.id, event.previousIndex, event.currentIndex)
      .subscribe({
        error: (err) =>
          this.erroLista.set(
            mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
          ),
      });
  }

  protected abrirIncluir(): void {
    this.idExcluir.set(null);
    this.erroForm.set(null);
    this.editandoId.set(null);
    this.formAberto.set('incluir');
    this.formNome.set('');
    this.formCustoStr.set('');
    this.formDataLimite.set('');
  }

  protected abrirEditar(t: TarefaListItem): void {
    this.idExcluir.set(null);
    this.erroForm.set(null);
    this.editandoId.set(t.id);
    this.formAberto.set('editar');
    this.formNome.set(t.nome);
    this.formCustoStr.set(t.custo);
    this.formDataLimite.set(t.dataLimite);
  }

  protected fecharForm(): void {
    this.formAberto.set(null);
    this.editandoId.set(null);
    this.erroForm.set(null);
  }

  protected onCustoDigitacao(valor: string): void {
    let v = valor.replace(/[^\d.,]/g, '');
    const partes = v.split(',');
    if (partes.length > 2) {
      v = partes[0] + ',' + partes.slice(1).join('');
    }
    this.formCustoStr.set(v);
  }

  protected onDataLimiteDigitacao(valor: string): void {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    let out = '';
    if (digitos.length > 0) out = digitos.slice(0, 2);
    if (digitos.length >= 3) out += '/' + digitos.slice(2, 4);
    if (digitos.length >= 5) out += '/' + digitos.slice(4, 8);
    this.formDataLimite.set(out);
  }

  protected salvarForm(): void {
    this.erroForm.set(null);
    if (!this.validarFormularioAntesSalvar()) {
      return;
    }

    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const dataIso = this.dataBrParaIso(this.formDataLimite().trim());
    if (!dataIso) {
      this.erroForm.set(MSG_ERRO.DATA_INVALIDA);
      return;
    }
    const dto = { nome, custo, dataLimite: dataIso };

    const modo = this.formAberto();
    if (modo === 'incluir') {
      this.api.incluir(dto).subscribe({
        next: (r) => {
          if (r.ok) {
            this.fecharForm();
          } else {
            this.erroForm.set(r.mensagem ?? MSG_ERRO[r.erro]);
          }
        },
        error: (err) =>
          this.erroForm.set(
            mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
          ),
      });
      return;
    }

    if (modo === 'editar') {
      const id = this.editandoId();
      if (id === null) return;
      this.api.editar(id, dto).subscribe({
        next: (r) => {
          if (r.ok) {
            this.fecharForm();
          } else {
            this.erroForm.set(r.mensagem ?? MSG_ERRO[r.erro]);
          }
        },
        error: (err) =>
          this.erroForm.set(
            mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
          ),
      });
    }
  }

  protected abrirExcluir(t: TarefaListItem): void {
    this.fecharForm();
    this.idExcluir.set(t.id);
  }

  protected fecharExcluir(): void {
    this.idExcluir.set(null);
  }

  protected confirmarExcluir(): void {
    const id = this.idExcluir();
    if (id === null) return;
    this.api.excluir(id).subscribe({
      next: () => this.fecharExcluir(),
      error: (err) => {
        this.erroLista.set(
          mensagemErroHttp(err, MSG_ERRO.ERRO_REDE, MSG_ERRO.ERRO_SERVIDOR),
        );
        this.fecharExcluir();
      },
    });
  }

  protected nomeExcluindo(): string {
    const id = this.idExcluir();
    if (id === null) return '';
    return this.tarefas().find((t) => t.id === id)?.nome ?? '';
  }

  private validarFormularioAntesSalvar(): boolean {
    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const dataLimite = this.formDataLimite().trim();

    if (!nome) {
      this.erroForm.set(MSG_ERRO.NOME_OBRIGATORIO);
      return false;
    }
    if (!Number.isFinite(custo) || custo < 0) {
      this.erroForm.set(MSG_ERRO.CUSTO_INVALIDO);
      return false;
    }
    if (!this.dataLimiteValidaBr(dataLimite)) {
      this.erroForm.set(MSG_ERRO.DATA_INVALIDA);
      return false;
    }
    return true;
  }

  private dataLimiteValidaBr(s: string): boolean {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
    if (!m) return false;
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const ano = Number(m[3]);
    const dt = new Date(ano, mes - 1, dia);
    return (
      dt.getFullYear() === ano &&
      dt.getMonth() === mes - 1 &&
      dt.getDate() === dia
    );
  }

  private dataBrParaIso(s: string): string | null {
    if (!this.dataLimiteValidaBr(s)) return null;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim())!;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  private parseCustoBr(s: string): number {
    let t = s
      .trim()
      .replace(/\u00a0/g, '')
      .replace(/\u202f/g, '')
      .replace(/^R\$\s*/i, '')
      .replace(/\s/g, '');
    if (!t) return NaN;
    if (t.includes(',')) {
      return Number(t.replace(/\./g, '').replace(',', '.'));
    }
    if (/^\d+\.\d+$/.test(t) && t.split('.')[1].length <= 2) {
      return Number(t);
    }
    return Number(t.replace(/\./g, ''));
  }
}
