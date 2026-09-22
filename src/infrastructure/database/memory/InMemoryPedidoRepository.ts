import type { IPedidoRepository } from '../../../core/application/repositories/IPedidoRepository';
import type { Pedido } from '../../../core/domain/entities/Pedido';
import type { StatusPedido } from '../../../core/domain/enums/StatusPedido';

export class InMemoryPedidoRepository implements IPedidoRepository {
  private readonly store = new Map<string, Pedido>();

  async save(pedido: Pedido): Promise<void> {
    this.store.set(pedido.id, pedido);
  }

  async findById(id: string): Promise<Pedido | null> {
    const pedido = this.store.get(id) ?? null;
    return pedido && pedido.deletedAt === null ? pedido : null;
  }

  async findByUsuario(usuarioId: string): Promise<Pedido[]> {
    return [...this.store.values()].filter(
      (pedido) => pedido.usuarioId === usuarioId && pedido.deletedAt === null,
    );
  }

  async findByStatus(usuarioId: string, status: StatusPedido): Promise<Pedido[]> {
    return [...this.store.values()].filter(
      (pedido) =>
        pedido.usuarioId === usuarioId && pedido.status === status && pedido.deletedAt === null,
    );
  }
}
