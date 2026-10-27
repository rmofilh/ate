export type StatusObra = 'DISPONIVEL' | 'RESERVADA' | 'ENTREGUE' | 'ARQUIVADA';

export const STATUS_OBRA = [
  'DISPONIVEL',
  'RESERVADA',
  'ENTREGUE',
  'ARQUIVADA',
] as const satisfies readonly StatusObra[];
