import { ErroDeSincronizacao } from '../core/application/errors/ErroDeSincronizacao';
import type { IArmazenamentoRemoto } from '../core/application/gateways/IArmazenamentoRemoto';
import type { IServidorRemoto } from '../core/application/gateways/IServidorRemoto';
import type { Cursor, LinhaRemota, TabelaSync } from '../core/application/sync/tipos';
import { fsDeTeste } from './mocks/expoFileSystem';

/**
 * Supabase em memória para testes de ponta a ponta do sync: upsert por id com updated_at do
 * "servidor" (microssegundos, como o Postgres), pull por cursor composto e o CHECK de pedido
 * FEITO com foto. Arquivos: o bucket guarda bytes; baixar escreve no expo-file-system dublado.
 */
export class ServidorEmMemoria implements IServidorRemoto {
  readonly tabelas = new Map<TabelaSync, Map<string, LinhaRemota>>();
  readonly bucket = new Map<string, Uint8Array>();
  semRede = false;
  private relogio = 0;

  linhas(tabela: TabelaSync): LinhaRemota[] {
    return [...(this.tabelas.get(tabela)?.values() ?? [])];
  }

  private verificarRede() {
    if (this.semRede) throw new ErroDeSincronizacao('SEM_REDE', 'sem conexão');
  }

  /** O bucket `fotos` do mesmo servidor. */
  readonly armazenamento: IArmazenamentoRemoto = {
    enviar: async (caminhoLocal, caminhoRemoto) => {
      this.verificarRede();
      this.bucket.set(caminhoRemoto, fsDeTeste.ler(`file:///docs/${caminhoLocal}`));
    },
    baixar: async (caminhoRemoto, caminhoLocal) => {
      this.verificarRede();
      const bytes = this.bucket.get(caminhoRemoto);
      if (!bytes) throw new ErroDeSincronizacao('PERMANENTE', 'Object not found');
      fsDeTeste.escrever(`file:///docs/${caminhoLocal}`, String.fromCharCode(...bytes));
    },
  };

  async enviar(tabela: TabelaSync, dados: Record<string, unknown>): Promise<{ updatedAt: string }> {
    this.verificarRede();
    if (
      tabela === 'pedidos' &&
      dados.status === 'FEITO' &&
      !dados.venda_direta &&
      !dados.foto_conclusao_path
    ) {
      throw new ErroDeSincronizacao('PERMANENTE', 'violates check constraint ck_pedidos_feito_com_foto');
    }
    this.relogio += 1;
    const updatedAt = `2026-11-10T12:00:00.${String(this.relogio).padStart(6, '0')}+00:00`;
    const id = String(dados.id);
    if (!this.tabelas.has(tabela)) this.tabelas.set(tabela, new Map());
    this.tabelas.get(tabela)!.set(id, { id, updatedAt, dados: { ...dados, updated_at: updatedAt } });
    return { updatedAt };
  }

  async buscarAlteracoes(tabela: TabelaSync, cursor: Cursor | null, limite: number) {
    this.verificarRede();
    return this.linhas(tabela)
      .filter(
        (l) =>
          !cursor ||
          l.updatedAt > cursor.updatedAt ||
          (l.updatedAt === cursor.updatedAt && l.id > cursor.id),
      )
      .sort((x, y) => x.updatedAt.localeCompare(y.updatedAt) || x.id.localeCompare(y.id))
      .slice(0, limite);
  }
}
