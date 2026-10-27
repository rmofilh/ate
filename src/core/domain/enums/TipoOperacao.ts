export type TipoOperacao = 'CRIAR' | 'EDITAR' | 'DELETAR';

export const TIPO_OPERACAO = ['CRIAR', 'EDITAR', 'DELETAR'] as const satisfies readonly TipoOperacao[];
