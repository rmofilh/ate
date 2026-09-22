import type { Pedido } from '../../domain/entities/Pedido';
import type { StatusPedido } from '../../domain/enums/StatusPedido';

export interface IPedidoRepository {
  save(pedido: Pedido): Promise<void>;
  findById(id: string): Promise<Pedido | null>;
  findByUsuario(usuarioId: string): Promise<Pedido[]>;
  findByStatus(usuarioId: string, status: StatusPedido): Promise<Pedido[]>;
}
