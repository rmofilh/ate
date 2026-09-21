import type { CanalOrigem } from '../enums/CanalOrigem';
import type { StatusPedido } from '../enums/StatusPedido';
import type { StatusSync } from '../enums/StatusSync';
import { PedidoInvalidoError } from '../errors/DomainErrors';
import { gerarId } from '../ids/gerarId';
import { isUuidV4 } from '../validation/uuid';

export interface PedidoProps {
  id: string;
  usuarioId: string;
  clienteId: string;
  obraId: string | null;
  descricao: string;
  canalOrigem: CanalOrigem;
  dataEntrega: Date;
  status: StatusPedido;
  fotoConclusaoPath: string | null;
  vendaDireta: boolean;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

function assertDataValida(data: Date): void {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
    throw new PedidoInvalidoError('dataEntrega inválida');
  }
}

export class Pedido {
  private _props: PedidoProps;

  private constructor(props: PedidoProps) {
    this._props = { ...props, dataEntrega: new Date(props.dataEntrega.getTime()) };
  }

  static criar(args: {
    usuarioId: string;
    clienteId: string;
    descricao: string;
    canalOrigem: CanalOrigem;
    dataEntrega: Date;
    obraId?: string | null;
  }): Pedido {
    const descricao = args.descricao.trim();
    if (!descricao) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');
    if (!isUuidV4(args.usuarioId)) throw new PedidoInvalidoError('usuarioId deve ser UUID v4');
    if (!isUuidV4(args.clienteId)) throw new PedidoInvalidoError('clienteId deve ser UUID v4');
    if (args.obraId !== undefined && args.obraId !== null && !isUuidV4(args.obraId)) {
      throw new PedidoInvalidoError('obraId deve ser UUID v4');
    }
    assertDataValida(args.dataEntrega);

    return new Pedido({
      id: gerarId(),
      usuarioId: args.usuarioId,
      clienteId: args.clienteId,
      obraId: args.obraId ?? null,
      descricao,
      canalOrigem: args.canalOrigem,
      dataEntrega: args.dataEntrega,
      status: 'A_FAZER',
      fotoConclusaoPath: null,
      vendaDireta: false,
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  static criarVendaDireta(args: {
    usuarioId: string;
    clienteId: string;
    obraId: string;
    descricao: string;
    canalOrigem: CanalOrigem;
  }): Pedido {
    if (!isUuidV4(args.usuarioId)) throw new PedidoInvalidoError('usuarioId deve ser UUID v4');
    if (!isUuidV4(args.clienteId)) throw new PedidoInvalidoError('clienteId deve ser UUID v4');
    if (!isUuidV4(args.obraId)) {
      throw new PedidoInvalidoError('vendaDireta exige obraId UUID v4 de SERIE');
    }
    const descricao = args.descricao.trim();
    if (!descricao) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');

    return new Pedido({
      id: gerarId(),
      usuarioId: args.usuarioId,
      clienteId: args.clienteId,
      obraId: args.obraId,
      descricao,
      canalOrigem: args.canalOrigem,
      dataEntrega: new Date(),
      status: 'FEITO',
      fotoConclusaoPath: null,
      vendaDireta: true,
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

  get clienteId(): string {
    return this._props.clienteId;
  }

  get obraId(): string | null {
    return this._props.obraId;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get canalOrigem(): CanalOrigem {
    return this._props.canalOrigem;
  }

  get dataEntrega(): Date {
    return new Date(this._props.dataEntrega.getTime());
  }

  get status(): StatusPedido {
    return this._props.status;
  }

  get fotoConclusaoPath(): string | null {
    return this._props.fotoConclusaoPath;
  }

  get vendaDireta(): boolean {
    return this._props.vendaDireta;
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

  moverParaFazendo(): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') {
      throw new PedidoInvalidoError('moverParaFazendo() válido somente de A_FAZER');
    }
    this._props.status = 'FAZENDO';
    this._props.statusSync = 'PENDENTE';
  }

  concluir(fotoPath: string | null | undefined): void {
    this.assertVivo();
    if (this._props.status !== 'FAZENDO') {
      throw new PedidoInvalidoError('concluir() válido somente de FAZENDO');
    }
    if (!fotoPath || !fotoPath.trim()) {
      throw new PedidoInvalidoError('Foto de conclusão é obrigatória (regra rígida)');
    }
    this._props.fotoConclusaoPath = fotoPath;
    this._props.status = 'FEITO';
    this._props.statusSync = 'PENDENTE';
  }

  editar(descricao: string, dataEntrega: Date): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') {
      throw new PedidoInvalidoError('editar() válido somente em A_FAZER');
    }
    const d = descricao.trim();
    if (!d) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');
    assertDataValida(dataEntrega);
    this._props.descricao = d;
    this._props.dataEntrega = new Date(dataEntrega.getTime());
    this._props.statusSync = 'PENDENTE';
  }

  vincularObra(obraId: string): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') {
      throw new PedidoInvalidoError('vincularObra() válido somente em A_FAZER');
    }
    if (!isUuidV4(obraId)) throw new PedidoInvalidoError('obraId deve ser UUID v4');
    if (this._props.obraId !== null) {
      throw new PedidoInvalidoError('pedido já possui obra vinculada');
    }
    this._props.obraId = obraId;
    this._props.statusSync = 'PENDENTE';
  }

  cancelar(): void {
    if (this._props.deletedAt !== null) return;
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertVivo(): void {
    if (this._props.deletedAt !== null) {
      throw new PedidoInvalidoError('Pedido removido não pode transicionar');
    }
  }
}
