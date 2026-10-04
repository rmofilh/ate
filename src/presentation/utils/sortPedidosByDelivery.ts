import type { Pedido } from '@/core/domain/entities/Pedido';

/** A projection for display only: canonical UTC calendar days, stable ties, no source mutation. */
export function sortPedidosByDelivery(pedidos: readonly Pedido[]): Pedido[] {
  return pedidos
    .map((pedido, index) => ({ pedido, index, day: pedido.dataEntrega.toISOString().slice(0, 10) }))
    .sort((left, right) => {
      if (left.day < right.day) return -1;
      if (left.day > right.day) return 1;
      return left.index - right.index;
    })
    .map(({ pedido }) => pedido);
}
