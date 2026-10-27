import { sql } from 'drizzle-orm';

import type { DrizzleAppDb } from './DrizzleDb';

/**
 * Roda um trabalho assíncrono entre BEGIN/COMMIT/ROLLBACK na conexão única do app
 * e serializa os trabalhos. Não aninhar: um trabalho não pode chamar executar() de novo.
 *
 * Por que não db.transaction(async ...): no driver drizzle-orm/expo-sqlite a transação é
 * síncrona e faz COMMIT assim que o callback devolve a Promise; as escritas depois do
 * primeiro await ficariam fora dela, sem erro.
 *
 * Limites conhecidos:
 * - Leituras fora do executor (ex.: loadData da UI) durante um trabalho podem ver dados
 *   ainda não confirmados. Inofensivo aqui: usuário único e dados pequenos.
 * - Nenhum caso de uso decorado chama outro decorado (VendaDireta instancia
 *   ResolverClienteBalcao direto, sem decorator).
 * - Rollback no expo-sqlite real confirmado só no smoke test do aparelho.
 */
export class ExecutorDeTransacao {
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: DrizzleAppDb) {}

  executar<T>(trabalho: () => Promise<T>): Promise<T> {
    const execucao = this.fila.then(async () => {
      this.db.run(sql`BEGIN IMMEDIATE`);
      try {
        const resultado = await trabalho();
        this.db.run(sql`COMMIT`);
        return resultado;
      } catch (erro) {
        this.db.run(sql`ROLLBACK`);
        throw erro;
      }
    });
    this.fila = execucao.catch(() => undefined);
    return execucao;
  }
}

type ComExecute = { execute(...args: never[]): Promise<unknown> };

/** Mesmo tipo e mesmo protótipo do caso de uso; execute() passa a rodar em transação. */
export function transacional<U extends ComExecute>(casoDeUso: U, executor: ExecutorDeTransacao): U {
  const original = casoDeUso.execute.bind(casoDeUso) as (...args: unknown[]) => Promise<unknown>;
  const decorado = Object.create(Object.getPrototypeOf(casoDeUso)) as U;
  Object.assign(decorado, casoDeUso);
  (decorado as unknown as { execute: unknown }).execute = (...args: unknown[]) =>
    executor.executar(() => original(...args));
  return decorado;
}
