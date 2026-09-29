import type { Pedido } from '../../domain/entities/Pedido';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class EditarPedidoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    pedidoId: string;
    descricao: string;
    dataEntrega: Date;
  }): Promise<Pedido> {
    const pedido = await this.pedidos.findById(args.pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');

    pedido.editar(args.descricao, args.dataEntrega);
    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'EDITAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ descricao: pedido.descricao }),
    );
    return pedido;
  }
}
