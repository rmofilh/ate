import type { StatusObra } from '../enums/StatusObra';
import type { StatusSync } from '../enums/StatusSync';
import type { TipoObra } from '../enums/TipoObra';
import { ObraInvalidaError } from '../errors/DomainErrors';
import { gerarId } from '../ids/gerarId';
import { isUuidV4 } from '../validation/uuid';

export interface ObraProps {
  id: string;
  usuarioId: string;
  nome: string;
  tipo: TipoObra;
  quantidade: number;
  statusObra: StatusObra;
  fotoPath: string | null;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

function assertQtdInteira(qtd: number, campo = 'quantidade'): void {
  if (!Number.isInteger(qtd)) throw new ObraInvalidaError(`${campo} deve ser inteiro`);
}

export class Obra {
  private _props: ObraProps;

  private constructor(props: ObraProps) {
    this._props = { ...props };
  }

  static criar(args: {
    usuarioId: string;
    nome: string;
    tipo: TipoObra;
    quantidade?: number;
    fotoPath?: string | null;
  }): Obra {
    const nome = args.nome.trim();
    if (!nome) throw new ObraInvalidaError('Nome da obra é obrigatório');
    if (!isUuidV4(args.usuarioId)) throw new ObraInvalidaError('usuarioId deve ser UUID v4');

    if (args.tipo === 'UNICA') {
      return new Obra({
        id: gerarId(),
        usuarioId: args.usuarioId,
        nome,
        tipo: 'UNICA',
        quantidade: 1,
        statusObra: 'DISPONIVEL',
        fotoPath: args.fotoPath ?? null,
        statusSync: 'PENDENTE',
        criadoEmLocal: new Date(),
        deletedAt: null,
      });
    }

    const qtd = args.quantidade ?? 0;
    assertQtdInteira(qtd);
    if (qtd <= 0) throw new ObraInvalidaError('Obra em série exige quantidade > 0');

    return new Obra({
      id: gerarId(),
      usuarioId: args.usuarioId,
      nome,
      tipo: 'SERIE',
      quantidade: qtd,
      statusObra: 'DISPONIVEL',
      fotoPath: args.fotoPath ?? null,
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  get id(): string {
    return this._props.id;
  }

  get usuarioId(): string {
    return this._props.usuarioId;
  }

  get nome(): string {
    return this._props.nome;
  }

  get tipo(): TipoObra {
    return this._props.tipo;
  }

  get quantidade(): number {
    return this._props.quantidade;
  }

  get statusObra(): StatusObra {
    return this._props.statusObra;
  }

  get fotoPath(): string | null {
    return this._props.fotoPath;
  }

  get statusSync(): StatusSync {
    return this._props.statusSync;
  }

  get criadoEmLocal(): Date {
    return this._props.criadoEmLocal;
  }

  get deletedAt(): Date | null {
    return this._props.deletedAt;
  }

  reservar(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA' || this._props.statusObra !== 'DISPONIVEL') {
      throw new ObraInvalidaError('reservar() válido somente para UNICA DISPONIVEL');
    }
    this._props.statusObra = 'RESERVADA';
    this._props.statusSync = 'PENDENTE';
  }

  liberar(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA' || this._props.statusObra !== 'RESERVADA') {
      throw new ObraInvalidaError('liberar() válido somente para UNICA RESERVADA');
    }
    this._props.statusObra = 'DISPONIVEL';
    this._props.statusSync = 'PENDENTE';
  }

  darBaixa(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA') {
      throw new ObraInvalidaError('darBaixa() válido somente para UNICA');
    }
    this._props.statusObra = 'ENTREGUE';
    this._props.statusSync = 'PENDENTE';
  }

  restaurarAposCancelamento(): void {
    this.assertViva();
    if (
      this._props.tipo !== 'UNICA' ||
      (this._props.statusObra !== 'RESERVADA' && this._props.statusObra !== 'ENTREGUE')
    ) {
      throw new ObraInvalidaError(
        'restaurarAposCancelamento() valido somente para UNICA RESERVADA ou ENTREGUE',
      );
    }
    this._props.statusObra = 'DISPONIVEL';
    this._props.statusSync = 'PENDENTE';
  }

  adicionarUnidades(qtd: number): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') {
      throw new ObraInvalidaError('adicionarUnidades() válido somente para SERIE');
    }
    assertQtdInteira(qtd, 'qtd');
    if (qtd <= 0) throw new ObraInvalidaError('qtd deve ser > 0');
    this._props.quantidade += qtd;
    this._props.statusSync = 'PENDENTE';
  }

  decrementarUnidades(): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') {
      throw new ObraInvalidaError('decrementarUnidades() válido somente para SERIE');
    }
    if (this._props.quantidade <= 0) throw new ObraInvalidaError('Sem estoque para baixa');
    this._props.quantidade -= 1;
    this._props.statusSync = 'PENDENTE';
  }

  incrementarUnidades(): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') {
      throw new ObraInvalidaError('incrementarUnidades() válido somente para SERIE');
    }
    this._props.quantidade += 1;
    this._props.statusSync = 'PENDENTE';
  }

  removerUnidades(qtd: number): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') {
      throw new ObraInvalidaError('removerUnidades() válido somente para SERIE');
    }
    assertQtdInteira(qtd, 'qtd');
    if (qtd <= 0 || qtd > this._props.quantidade) {
      throw new ObraInvalidaError('qtd deve satisfazer 0 < qtd <= quantidade');
    }
    this._props.quantidade -= qtd;
    this._props.statusObra = 'DISPONIVEL';
    this._props.statusSync = 'PENDENTE';
  }

  arquivar(): void {
    this.assertViva();
    this._props.statusObra = 'ARQUIVADA';
    this._props.statusSync = 'PENDENTE';
  }

  editar(nome: string): void {
    this.assertViva();
    const n = nome.trim();
    if (!n) throw new ObraInvalidaError('Nome da obra é obrigatório');
    this._props.nome = n;
    this._props.statusSync = 'PENDENTE';
  }

  marcarRemovido(): void {
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertViva(): void {
    if (this._props.deletedAt !== null) {
      throw new ObraInvalidaError('Obra removida não pode transicionar');
    }
    if (this._props.statusObra === 'ARQUIVADA') {
      throw new ObraInvalidaError('Obra arquivada não pode transicionar');
    }
  }
}
