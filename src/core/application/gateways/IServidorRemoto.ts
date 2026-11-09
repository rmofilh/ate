import type { Cursor, LinhaRemota, TabelaSync } from '../sync/tipos';

/** Banco remoto. Falhas chegam como ErroDeSincronizacao. */
export interface IServidorRemoto {
  /** Upsert idempotente pelo id (UUID do aparelho). Devolve o updated_at oficial do servidor. */
  enviar(tabela: TabelaSync, dados: Record<string, unknown>): Promise<{ updatedAt: string }>;
  /** Até `limite` linhas depois do cursor, ordenadas por (updated_at, id). */
  buscarAlteracoes(tabela: TabelaSync, cursor: Cursor | null, limite: number): Promise<LinhaRemota[]>;
}
