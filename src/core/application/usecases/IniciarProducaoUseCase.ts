import type { Pedido } from '../../domain/entities/Pedido';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class IniciarProducaoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { pedidoId: string }): Promise<Pedido> {
    const pedido = await this.pedidos.findById(args.pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');

    pedido.moverParaFazendo();
    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'EDITAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ status: pedido.status }),
    );
    return pedido;
  }
}
