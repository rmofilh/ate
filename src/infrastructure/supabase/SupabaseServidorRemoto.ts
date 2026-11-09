import type { SupabaseClient } from '@supabase/supabase-js';

import type { IServidorRemoto } from '../../core/application/gateways/IServidorRemoto';
import type { Cursor, LinhaRemota, TabelaSync } from '../../core/application/sync/tipos';
import { comLimiteDeTempo } from '../shared/limiteDeTempo';
import { erroDeRede, traduzirErroSupabase } from './traduzirErroSupabase';

export const LIMITE_REQUISICAO_MS = 20_000;

/** Tabelas do Supabase via PostgREST. O RLS garante que só as linhas do usuário aparecem. */
export class SupabaseServidorRemoto implements IServidorRemoto {
  constructor(
    private readonly cliente: Pick<SupabaseClient, 'from'>,
    private readonly limiteMs = LIMITE_REQUISICAO_MS,
  ) {}

  async enviar(tabela: TabelaSync, dados: Record<string, unknown>): Promise<{ updatedAt: string }> {
    const resposta = await this.chamar(
      this.cliente.from(tabela).upsert(dados, { onConflict: 'id' }).select('updated_at').single(),
    );
    if (resposta.error) throw traduzirErroSupabase({ ...resposta.error, status: resposta.status });
    return { updatedAt: String((resposta.data as { updated_at: string }).updated_at) };
  }

  async buscarAlteracoes(
    tabela: TabelaSync,
    cursor: Cursor | null,
    limite: number,
  ): Promise<LinhaRemota[]> {
    let consulta = this.cliente.from(tabela).select('*');
    if (cursor) {
      // Cursor composto: (updated_at > c) ou (updated_at = c e id > id_c). Valores entre aspas
      // porque o timestamp tem ponto e dois-pontos.
      const instante = `"${cursor.updatedAt}"`;
      consulta = consulta.or(
        `updated_at.gt.${instante},and(updated_at.eq.${instante},id.gt.${cursor.id})`,
      );
    }
    const resposta = await this.chamar(
      consulta.order('updated_at', { ascending: true }).order('id', { ascending: true }).limit(limite),
    );
    if (resposta.error) throw traduzirErroSupabase({ ...resposta.error, status: resposta.status });
    return ((resposta.data ?? []) as Record<string, unknown>[]).map((linha) => ({
      id: String(linha.id),
      updatedAt: String(linha.updated_at),
      dados: linha,
    }));
  }

  private async chamar<T extends { error: unknown; status: number }>(
    requisicao: PromiseLike<T>,
  ): Promise<T> {
    try {
      return await comLimiteDeTempo(Promise.resolve(requisicao), this.limiteMs, () =>
        new Error('Tempo esgotado'),
      );
    } catch (erro) {
      throw erroDeRede(erro);
    }
  }
}
