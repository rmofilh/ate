export type StatusPedido = 'A_FAZER' | 'FAZENDO' | 'FEITO';

export const STATUS_PEDIDO = ['A_FAZER', 'FAZENDO', 'FEITO'] as const satisfies readonly StatusPedido[];
