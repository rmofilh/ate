import type { Pedido } from '../../domain/entities/Pedido';
import type { StatusPedido } from '../../domain/enums/StatusPedido';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class ConsultarPedidosUseCase {
  constructor(private readonly pedidos: IPedidoRepository) {}

  async execute(args: { usuarioId: string; status?: StatusPedido }): Promise<Pedido[]> {
    if (args.status) return this.pedidos.findByStatus(args.usuarioId, args.status);
    return this.pedidos.findByUsuario(args.usuarioId);
  }
}
