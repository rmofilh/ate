import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import type { DrizzleAppDb } from '../DrizzleDb';
import { CHAVE_DONO, DonoDosDadosLocais } from '../DonoDosDadosLocais';
import { clientes, eventos, filaSync, fotos, obras, pedidos, syncMeta } from '../schema';

const A = 'a1111111-1111-4111-8111-111111111111';
const B = 'b2222222-2222-4222-8222-222222222222';
const QUANDO = '2026-10-27T12:00:00.000Z';

describe('DonoDosDadosLocais', () => {
  let db: DrizzleAppDb;
  let dono: DonoDosDadosLocais;

  beforeEach(() => {
    db = bancoDeTeste();
    dono = new DonoDosDadosLocais(db);
  });

  async function dadosDe(usuarioId: string) {
    await db.insert(clientes).values({
      id: 'c1', usuarioId, nome: 'Ana', contato: '1', statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(obras).values({
      id: 'o1', usuarioId, nome: 'Coruja', tipo: 'UNICA', quantidade: 1, statusObra: 'DISPONIVEL',
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(pedidos).values({
      id: 'p1', usuarioId, clienteId: 'c1', obraId: 'o1', descricao: 'Vaso', canalOrigem: 'WHATSAPP',
      dataEntrega: QUANDO, status: 'A_FAZER', vendaDireta: false, quantidadeObra: 1,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(eventos).values({
      id: 'e1', usuarioId, nome: 'Feira', data: QUANDO, endereco: 'Praça', latitude: 0, longitude: 0,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(filaSync).values({
      id: 'f1', tipoOperacao: 'CRIAR', entidade: 'Cliente', entidadeId: 'c1', payload: '{}',
      criadoEmLocal: QUANDO,
    });
    await db.insert(fotos).values({ id: 'ft1', caminhoLocal: 'fotos/x.jpg', hash: 'h', criadoEmLocal: QUANDO });
  }

  it('banco vazio não tem dono', async () => {
    await expect(dono.ler()).resolves.toBeNull();
  });

  it('dono registrado em sync_meta', async () => {
    await dono.registrar(A);
    await expect(dono.ler()).resolves.toBe(A);
    expect(await db.select().from(syncMeta)).toEqual([{ chave: CHAVE_DONO, valor: A }]);
  });

  it('registrar de novo substitui sem duplicar', async () => {
    await dono.registrar(A);
    await dono.registrar(B);
    await expect(dono.ler()).resolves.toBe(B);
    expect(await db.select().from(syncMeta)).toHaveLength(1);
  });

  it('sem registro, o dono é quem tem dados locais (dados de desenvolvimento)', async () => {
    await dadosDe(A);
    await expect(dono.ler()).resolves.toBe(A);
  });

  it('só um evento (sem cliente) também identifica o dono', async () => {
    await db.insert(eventos).values({
      id: 'e9', usuarioId: B, nome: 'Feira', data: QUANDO, endereco: 'Praça', latitude: 0, longitude: 0,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await expect(dono.ler()).resolves.toBe(B);
  });

  it('apagarTudo zera todas as tabelas locais, inclusive fila, fotos e o dono', async () => {
    await dadosDe(A);
    await dono.registrar(A);

    await dono.apagarTudo();

    for (const tabela of [clientes, obras, pedidos, eventos, filaSync, fotos, syncMeta]) {
      expect(await db.select().from(tabela)).toEqual([]);
    }
    await expect(dono.ler()).resolves.toBeNull();
  });
});
