import { eq } from 'drizzle-orm';

import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../../test-support/ids';
import { OutboxSyncGateway } from '../../../sync/OutboxSyncGateway';
import type { DrizzleAppDb } from '../DrizzleDb';
import { ExecutorDeTransacao, transacional } from '../ExecutorDeTransacao';
import { clientes, filaSync } from '../schema';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';

async function gravarCliente(db: DrizzleAppDb, id: string): Promise<void> {
  await db.insert(clientes).values({
    id,
    usuarioId: USUARIO,
    nome: `Cliente ${id}`,
    contato: '1',
    statusSync: 'PENDENTE',
    criadoEmLocal: new Date().toISOString(),
  });
}

describe('ExecutorDeTransacao', () => {
  let db: DrizzleAppDb;
  let executor: ExecutorDeTransacao;
  let outbox: OutboxSyncGateway;

  beforeEach(() => {
    db = bancoDeTeste();
    executor = new ExecutorDeTransacao(db);
    outbox = new OutboxSyncGateway(db, idsTeste);
  });

  it('commit grava registro e fila', async () => {
    const resultado = await executor.executar(async () => {
      await gravarCliente(db, 'c1');
      await outbox.enqueue('CRIAR', 'Cliente', 'c1', '{}');
      return 'ok';
    });

    expect(resultado).toBe('ok');
    expect(await db.select().from(clientes)).toHaveLength(1);
    expect(await db.select().from(filaSync)).toHaveLength(1);
  });

  it('falha entre as duas escritas não deixa nada', async () => {
    await expect(
      executor.executar(async () => {
        await gravarCliente(db, 'c1');
        throw new Error('falhou no meio');
      }),
    ).rejects.toThrow('falhou no meio');

    expect(await db.select().from(clientes)).toHaveLength(0);
    expect(await db.select().from(filaSync)).toHaveLength(0);
  });

  it('serializa chamadas concorrentes e desfaz só a que falha', async () => {
    const trabalho = (id: string, falhar = false) =>
      executor.executar(async () => {
        await gravarCliente(db, id);
        await Promise.resolve();
        await outbox.enqueue('CRIAR', 'Cliente', id, '{}');
        if (falhar) throw new Error(`falha ${id}`);
      });

    const resultados = await Promise.allSettled([
      trabalho('c1'),
      trabalho('c2', true),
      trabalho('c3'),
    ]);

    expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    const ids = (await db.select().from(clientes)).map((c) => c.id).sort();
    expect(ids).toEqual(['c1', 'c3']);
    const fila = await db.select().from(filaSync).where(eq(filaSync.entidadeId, 'c2'));
    expect(fila).toHaveLength(0);
  });

  it('o executor continua usável depois de uma falha', async () => {
    await expect(executor.executar(async () => Promise.reject(new Error('x')))).rejects.toThrow();
    await executor.executar(async () => gravarCliente(db, 'c9'));
    expect(await db.select().from(clientes)).toHaveLength(1);
  });
});

describe('transacional', () => {
  class CasoDeUsoFalso {
    chamadas = 0;

    constructor(private readonly db: DrizzleAppDb) {}

    async execute(args: { id: string; falhar: boolean }): Promise<string> {
      this.chamadas += 1;
      await gravarCliente(this.db, args.id);
      if (args.falhar) throw new Error('falhou');
      return args.id;
    }
  }

  it('preserva instanceof e o retorno, e roda execute() em transação', async () => {
    const db = bancoDeTeste();
    const executor = new ExecutorDeTransacao(db);
    const decorado = transacional(new CasoDeUsoFalso(db), executor);

    expect(decorado).toBeInstanceOf(CasoDeUsoFalso);
    await expect(decorado.execute({ id: 'c1', falhar: false })).resolves.toBe('c1');
    await expect(decorado.execute({ id: 'c2', falhar: true })).rejects.toThrow('falhou');

    const ids = (await db.select().from(clientes)).map((c) => c.id);
    expect(ids).toEqual(['c1']);
  });
});
