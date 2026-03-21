import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { Tarefa, TarefaErro } from './tarefa.model';
import { TarefaService } from './tarefa.service';

const BREAKPOINT_MOBILE = '(max-width: 52rem)';
const CUSTO_DESTAQUE_MIN = 1000;
const NOME_MAX_DESKTOP = 42;
const NOME_MAX_MOBILE = 12;

const MSG_ERRO: Record<TarefaErro, string> = {
  CUSTO_INVALIDO:
    'Informe apenas números. O custo deve ser maior que zero (R$ 0,00 não é permitido).',
  DATA_INVALIDA: 'Informe uma data limite válida.',
  NOME_DUPLICADO: 'Já existe uma tarefa com este nome.',
  NOME_OBRIGATORIO: 'O nome da tarefa é obrigatório.',
};

@Component({
  selector: 'app-tarefa-list',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './tarefa-list.component.html',
  styleUrl: './tarefa-list.component.css',
})
export class TarefaListComponent {
  private readonly tarefaService = inject(TarefaService);
  private readonly breakpoint = inject(BreakpointObserver);

  protected readonly layoutMobile = toSignal(
    this.breakpoint.observe(BREAKPOINT_MOBILE).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly tarefas = this.tarefaService.tarefas;
  protected readonly somaCustos = this.tarefaService.somaCustos;

  protected readonly formAberto = signal<'incluir' | 'editar' | null>(null);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly idExcluir = signal<number | null>(null);

  protected readonly formNome = signal('');
  protected readonly formCustoStr = signal('');
  protected readonly formDataLimite = signal('');

  protected readonly erroForm = signal<string | null>(null);
  protected readonly nomeCompletoModal = signal<string | null>(null);

  protected readonly podeSalvarFormulario = computed(() => {
    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const data = this.formDataLimite().trim();
    if (!nome) return false;
    if (!Number.isFinite(custo) || custo <= 0) return false;
    return this.dataLimiteValida(data);
  });

  private readonly primeiroCampoForm = viewChild<ElementRef<HTMLInputElement>>(
    'primeiroCampoForm',
  );

  constructor() {
    effect(() => {
      if (this.formAberto() === null) return;
      setTimeout(() => this.primeiroCampoForm()?.nativeElement.focus(), 0);
    });
  }

  protected custoAlto(t: Tarefa): boolean {
    return t.custo >= CUSTO_DESTAQUE_MIN;
  }

  protected podeSubir(t: Tarefa): boolean {
    const list = this.tarefas();
    const i = list.findIndex((x) => x.id === t.id);
    return i > 0;
  }

  protected podeDescer(t: Tarefa): boolean {
    const list = this.tarefas();
    const i = list.findIndex((x) => x.id === t.id);
    return i >= 0 && i < list.length - 1;
  }

  protected subir(t: Tarefa): void {
    this.tarefaService.subir(t.id);
  }

  protected descer(t: Tarefa): void {
    this.tarefaService.descer(t.id);
  }

  protected formatarDataLimite(iso: string): string {
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  protected nomeLongoDemais(nome: string): boolean {
    return nome.length > this.limiteNomeLista();
  }

  protected nomeParaLista(nome: string): string {
    const max = this.limiteNomeLista();
    if (nome.length <= max) return nome;
    return nome.slice(0, max).trimEnd() + '…';
  }

  protected abrirNomeCompleto(nome: string): void {
    this.nomeCompletoModal.set(nome);
  }

  protected fecharNomeCompleto(): void {
    this.nomeCompletoModal.set(null);
  }

  protected abrirIncluir(): void {
    this.fecharNomeCompleto();
    this.idExcluir.set(null);
    this.erroForm.set(null);
    this.editandoId.set(null);
    this.formAberto.set('incluir');
    this.formNome.set('');
    this.formCustoStr.set('');
    this.formDataLimite.set('');
  }

  protected abrirEditar(t: Tarefa): void {
    this.fecharNomeCompleto();
    this.idExcluir.set(null);
    this.erroForm.set(null);
    this.editandoId.set(t.id);
    this.formAberto.set('editar');
    this.formNome.set(t.nome);
    this.formCustoStr.set(
      t.custo.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
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

  protected salvarForm(): void {
    this.erroForm.set(null);
    if (!this.validarFormularioAntesSalvar()) {
      return;
    }

    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const dataLimite = this.formDataLimite().trim();
    const dto = { nome, custo, dataLimite };

    const modo = this.formAberto();
    if (modo === 'incluir') {
      const r = this.tarefaService.incluir(dto);
      if (r.ok) {
        this.fecharForm();
      } else {
        this.erroForm.set(MSG_ERRO[r.erro]);
      }
      return;
    }

    if (modo === 'editar') {
      const id = this.editandoId();
      if (id === null) return;
      const r = this.tarefaService.editar(id, dto);
      if (r.ok) {
        this.fecharForm();
      } else {
        this.erroForm.set(MSG_ERRO[r.erro]);
      }
    }
  }

  protected abrirExcluir(t: Tarefa): void {
    this.fecharNomeCompleto();
    this.fecharForm();
    this.idExcluir.set(t.id);
  }

  protected fecharExcluir(): void {
    this.idExcluir.set(null);
  }

  protected confirmarExcluir(): void {
    const id = this.idExcluir();
    if (id !== null) {
      this.tarefaService.excluir(id);
    }
    this.fecharExcluir();
  }

  protected nomeExcluindo(): string {
    const id = this.idExcluir();
    if (id === null) return '';
    return this.tarefas().find((t) => t.id === id)?.nome ?? '';
  }

  protected onDrop(event: CdkDragDrop<Tarefa[]>): void {
    const copia = [...this.tarefas()];
    if (
      event.previousIndex === event.currentIndex ||
      event.previousIndex < 0 ||
      event.currentIndex < 0
    ) {
      return;
    }
    moveItemInArray(copia, event.previousIndex, event.currentIndex);
    this.tarefaService.reordenar(copia.map((x) => x.id));
  }

  private limiteNomeLista(): number {
    return this.layoutMobile() ? NOME_MAX_MOBILE : NOME_MAX_DESKTOP;
  }

  private validarFormularioAntesSalvar(): boolean {
    const nome = this.formNome().trim();
    const custo = this.parseCustoBr(this.formCustoStr());
    const dataLimite = this.formDataLimite().trim();

    if (!nome) {
      this.erroForm.set(MSG_ERRO.NOME_OBRIGATORIO);
      return false;
    }
    if (!Number.isFinite(custo) || custo <= 0) {
      this.erroForm.set(MSG_ERRO.CUSTO_INVALIDO);
      return false;
    }
    if (!this.dataLimiteValida(dataLimite)) {
      this.erroForm.set(MSG_ERRO.DATA_INVALIDA);
      return false;
    }
    return true;
  }

  private dataLimiteValida(s: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
    );
  }

  private parseCustoBr(s: string): number {
    const t = s.trim().replace(/\s/g, '');
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
