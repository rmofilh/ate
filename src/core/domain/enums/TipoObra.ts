export type TipoObra = 'UNICA' | 'SERIE';

export const TIPO_OBRA = ['UNICA', 'SERIE'] as const satisfies readonly TipoObra[];
