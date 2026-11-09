import { and, asc, count, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import type { IFilaSync } from '../../core/application/gateways/IFilaSync';
import type { EntradaFila, ResumoSync } from '../../core/application/sync/tipos';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import type { ExecutorDeTransacao } from '../database/sqlite/ExecutorDeTransacao';
import { filaSync } from '../database/sqlite/schema';

/**
 * fila_sync para o sync. Tudo passa pelo executor: na conexão única, uma escrita do sync no meio
 * da transação de um caso de uso entraria nela (e sairia num rollback).
 */
export class SQLiteFilaSync implements IFilaSync {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly executor: ExecutorDeTransacao,
  ) {}

  elegiveis(agora: Date): Promise<EntradaFila[]> {
    return this.executor.executar(() =>
      this.db
        .select({
          id: filaSync.id,
          entidade: filaSync.entidade,
          entidadeId: filaSync.entidadeId,
          tentativas: filaSync.tentativas,
          criadoEmLocal: filaSync.criadoEmLocal,
        })
        .from(filaSync)
        .where(
          and(
            eq(filaSync.status, 'PENDENTE'),
            or(
              isNull(filaSync.proximaTentativaEm),
              lte(filaSync.proximaTentativaEm, agora.toISOString()),
            ),
          ),
        )
        .orderBy(asc(filaSync.criadoEmLocal)),
    );
  }

  async concluir(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.executor.executar(() => this.db.delete(filaSync).where(inArray(filaSync.id, ids)));
  }

  async reagendar(ids: string[], proximaEm: Date, erro: string): Promise<void> {
    await this.executor.executar(() =>
      this.db
        .update(filaSync)
        .set({
          tentativas: sql`${filaSync.tentativas} + 1`,
          proximaTentativaEm: proximaEm.toISOString(),
          erro,
        })
        .where(inArray(filaSync.id, ids)),
    );
  }

  async falhar(ids: string[], erro: string): Promise<void> {
    await this.executor.executar(() =>
      this.db
        .update(filaSync)
        .set({ status: 'FALHA', tentativas: sql`${filaSync.tentativas} + 1`, erro })
        .where(inArray(filaSync.id, ids)),
    );
  }

  temPendente(entidade: string, entidadeId: string): Promise<boolean> {
    return this.executor.executar(async () => {
      const [linha] = await this.db
        .select({ id: filaSync.id })
        .from(filaSync)
        .where(and(eq(filaSync.entidade, entidade), eq(filaSync.entidadeId, entidadeId)))
        .limit(1);
      return Boolean(linha);
    });
  }

  reenviarFalhas(): Promise<number> {
    return this.executor.executar(async () => {
      const falhas = await this.db
        .select({ id: filaSync.id })
        .from(filaSync)
        .where(eq(filaSync.status, 'FALHA'));
      if (falhas.length > 0) {
        await this.db
          .update(filaSync)
          .set({ status: 'PENDENTE', tentativas: 0, proximaTentativaEm: null, erro: null })
          .where(eq(filaSync.status, 'FALHA'));
      }
      return falhas.length;
    });
  }

  resumo(): Promise<ResumoSync> {
    return this.executor.executar(async () => {
      const linhas = await this.db
        .select({ status: filaSync.status, total: count() })
        .from(filaSync)
        .groupBy(filaSync.status);
      const total = (status: string) => linhas.find((l) => l.status === status)?.total ?? 0;
      return { pendentes: total('PENDENTE') + total('ENVIANDO'), falhas: total('FALHA') };
    });
  }
}
