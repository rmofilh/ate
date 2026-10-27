import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../test-support/ids';
import type { DrizzleAppDb } from '../../database/sqlite/DrizzleDb';
import { ExecutorDeTransacao } from '../../database/sqlite/ExecutorDeTransacao';
import { filaSync } from '../../database/sqlite/schema';
import { OutboxSyncGateway } from '../OutboxSyncGateway';

const AGORA = new Date('2026-10-27T13:00:00.000Z');

describe('OutboxSyncGateway', () => {
  let db: DrizzleAppDb;
  let outbox: OutboxSyncGateway;

  beforeEach(() => {
    db = bancoDeTeste();
    outbox = new OutboxSyncGateway(db, idsTeste, () => AGORA);
  });

  it('grava os campos da operação como PENDENTE', async () => {
    const payload = JSON.stringify({ nome: 'Ana', acento: 'ção' });
    await outbox.enqueue('CRIAR', 'Cliente', 'c1', payload);

    const [linha] = await db.select().from(filaSync);
    expect(linha).toEqual({
      id: expect.any(String),
      tipoOperacao: 'CRIAR',
      entidade: 'Cliente',
      entidadeId: 'c1',
      payload,
      status: 'PENDENTE',
      tentativas: 0,
      proximaTentativaEm: null,
      erro: null,
      criadoEmLocal: AGORA.toISOString(),
    });
  });

  it('dois enqueues da mesma entidade geram duas linhas', async () => {
    await outbox.enqueue('CRIAR', 'Obra', 'o1', '{}');
    await outbox.enqueue('EDITAR', 'Obra', 'o1', '{}');

    const linhas = await db.select().from(filaSync);
    expect(linhas.map((l) => l.tipoOperacao)).toEqual(['CRIAR', 'EDITAR']);
    expect(new Set(linhas.map((l) => l.id)).size).toBe(2);
  });

  it('dentro de uma transação que falha, o enqueue é desfeito', async () => {
    const executor = new ExecutorDeTransacao(db);
    await expect(
      executor.executar(async () => {
        await outbox.enqueue('CRIAR', 'Pedido', 'p1', '{}');
        throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');

    expect(await db.select().from(filaSync)).toHaveLength(0);
  });
});
