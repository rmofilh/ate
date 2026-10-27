export type StatusSync = 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';

export const STATUS_SYNC = ['PENDENTE', 'SINCRONIZADO', 'ERRO'] as const satisfies readonly StatusSync[];
