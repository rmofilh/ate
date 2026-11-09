import { eq } from 'drizzle-orm';

import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../test-support/ids';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import type { DrizzleAppDb } from '../../database/sqlite/DrizzleDb';
import { ExecutorDeTransacao } from '../../database/sqlite/ExecutorDeTransacao';
import { clientes, filaSync, fotos, obras, syncMeta } from '../../database/sqlite/schema';
import { SQLiteEstadoLocalSync } from '../SQLiteEstadoLocalSync';
import { SQLiteFilaSync } from '../SQLiteFilaSync';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const AGORA = new Date('2026-11-10T12:00:00.000Z');
const QUANDO = '2026-11-10T11:00:00.000Z';

describe('adaptadores SQLite do sync', () => {
  let db: DrizzleAppDb;
  let fila: SQLiteFilaSync;
  let estado: SQLiteEstadoLocalSync;

  beforeEach(() => {
    fsDeTeste.limpar();
    db = bancoDeTeste();
    const executor = new ExecutorDeTransacao(db);
    fila = new SQLiteFilaSync(db, executor);
    estado = new SQLiteEstadoLocalSync(db, executor, idsTeste, () => AGORA);
  });

  async function entrada(id: string, extra: Partial<typeof filaSync.$inferInsert> = {}) {
    await db.insert(filaSync).values({
      id,
      tipoOperacao: 'CRIAR',
      entidade: 'Cliente',
      entidadeId: 'c1',
      payload: '{}',
      criadoEmLocal: QUANDO,
      ...extra,
    });
  }

  async function cliente(id: string, statusSync = 'PENDENTE') {
    await db.insert(clientes).values({
      id,
      usuarioId: USUARIO,
      nome: 'Ana',
      contato: '1',
      statusSync,
      criadoEmLocal: QUANDO,
    });
  }

  describe('SQLiteFilaSync', () => {
    it('elegíveis: PENDENTE sem agenda ou com agenda vencida; FALHA e agendadas no futuro ficam de fora', async () => {
      await entrada('f1');
      await entrada('f2', { proximaTentativaEm: '2026-11-10T11:59:00.000Z' });
      await entrada('f3', { proximaTentativaEm: '2026-11-10T12:05:00.000Z' });
      await entrada('f4', { status: 'FALHA' });

      expect((await fila.elegiveis(AGORA)).map((e) => e.id)).toEqual(['f1', 'f2']);
    });

    it('reagendar soma tentativa; falhar marca FALHA; resumo conta; reenviar zera', async () => {
      await entrada('f1');
      await entrada('f2');
      await fila.reagendar(['f1'], new Date('2026-11-10T12:00:04.000Z'), '503');
      await fila.falhar(['f2'], 'check');

      const [f1] = await db.select().from(filaSync).where(eq(filaSync.id, 'f1'));
      expect(f1).toMatchObject({ tentativas: 1, erro: '503', proximaTentativaEm: '2026-11-10T12:00:04.000Z' });
      expect(await fila.resumo()).toEqual({ pendentes: 1, falhas: 1 });

      expect(await fila.reenviarFalhas()).toBe(1);
      expect(await fila.resumo()).toEqual({ pendentes: 2, falhas: 0 });
    });

    it('concluir remove; temPendente olha entidade e id', async () => {
      await entrada('f1');
      expect(await fila.temPendente('Cliente', 'c1')).toBe(true);
      await fila.concluir(['f1']);
      expect(await fila.temPendente('Cliente', 'c1')).toBe(false);
    });
  });

  describe('SQLiteEstadoLocalSync', () => {
    it('lerParaEnvio: formato remoto, sem status_sync nem updated_at', async () => {
      await cliente('c1');
      const registro = await estado.lerParaEnvio('clientes', 'c1');
      expect(registro).toEqual({
        tabela: 'clientes',
        id: 'c1',
        aguardandoFoto: false,
        dados: {
          id: 'c1',
          usuario_id: USUARIO,
          nome: 'Ana',
          contato: '1',
          criado_em_local: QUANDO,
          deleted_at: null,
        },
      });
    });

    it('foto ainda não enviada segura o registro; enviada vira o caminho remoto', async () => {
      await db.insert(fotos).values({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', hash: 'h', criadoEmLocal: QUANDO });
      await db.insert(obras).values({
        id: 'o1', usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA', quantidade: 1,
        statusObra: 'DISPONIVEL', fotoPath: 'fotos/ft1.jpg', statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
      });

      expect(await estado.fotosParaEnviar()).toEqual([{ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg' }]);
      expect((await estado.lerParaEnvio('obras', 'o1'))?.aguardandoFoto).toBe(true);

      await estado.marcarFotoEnviada('ft1', `${USUARIO}/ft1.jpg`);
      const registro = await estado.lerParaEnvio('obras', 'o1');
      expect(registro?.aguardandoFoto).toBe(false);
      expect(registro?.dados.foto_path).toBe(`${USUARIO}/ft1.jpg`);
      expect(await estado.fotosParaEnviar()).toEqual([]);
    });

    it('foto órfã (nenhum registro usa) não é enviada', async () => {
      await db.insert(fotos).values({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', hash: 'h', criadoEmLocal: QUANDO });
      expect(await estado.fotosParaEnviar()).toEqual([]);
    });

    it('aplicarLote não sobrescreve linha PENDENTE ou ERRO e avança o cursor', async () => {
      await cliente('c1', 'PENDENTE');
      await cliente('c2', 'SINCRONIZADO');
      const remota = (id: string, nome: string, updatedAt: string) => ({
        id,
        updatedAt,
        dados: { id, usuario_id: USUARIO, nome, contato: '1', criado_em_local: QUANDO, deleted_at: null },
      });

      const aplicadas = await estado.aplicarLote('clientes', [
        remota('c1', 'do servidor', '2026-11-10T12:00:00.000001+00:00'),
        remota('c2', 'do servidor', '2026-11-10T12:00:00.000002+00:00'),
      ]);

      expect(aplicadas).toBe(1);
      const linhas = await db.select().from(clientes).orderBy(clientes.id);
      expect(linhas.map((l) => l.nome)).toEqual(['Ana', 'do servidor']);
      expect(linhas[1]).toMatchObject({ statusSync: 'SINCRONIZADO', updatedAt: '2026-11-10T12:00:00.000002+00:00' });
      expect(await estado.cursor('clientes')).toEqual({ updatedAt: '2026-11-10T12:00:00.000002+00:00', id: 'c2' });
      expect(await db.select().from(syncMeta)).toHaveLength(1);
    });

    it('marcarErro e reenviarErros', async () => {
      await cliente('c1');
      await estado.marcarErro('clientes', 'c1');
      expect((await db.select().from(clientes))[0].statusSync).toBe('ERRO');
      await estado.reenviarErros();
      expect((await db.select().from(clientes))[0].statusSync).toBe('PENDENTE');
    });

    it('fotosParaBaixar: só as ENVIADAS cujo arquivo falta no aparelho', async () => {
      await db.insert(fotos).values([
        { id: 'a', caminhoLocal: 'fotos/a.jpg', hash: '', status: 'ENVIADA', caminhoRemoto: 'u/a.jpg', criadoEmLocal: QUANDO },
        { id: 'b', caminhoLocal: 'fotos/b.jpg', hash: '', status: 'ENVIADA', caminhoRemoto: 'u/b.jpg', criadoEmLocal: QUANDO },
        { id: 'c', caminhoLocal: 'fotos/c.jpg', hash: '', status: 'PENDENTE_UPLOAD', criadoEmLocal: QUANDO },
      ]);
      fsDeTeste.escrever('file:///docs/fotos/a.jpg');

      expect(await estado.fotosParaBaixar()).toEqual([{ caminhoLocal: 'fotos/b.jpg', caminhoRemoto: 'u/b.jpg' }]);
    });

    it('marcarFalhaDaFoto soma tentativa e guarda o erro, sem desistir da foto', async () => {
      await db.insert(fotos).values({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', hash: 'h', criadoEmLocal: QUANDO });
      await estado.marcarFalhaDaFoto('ft1', 'grande demais');
      expect((await db.select().from(fotos))[0]).toMatchObject({
        status: 'PENDENTE_UPLOAD',
        tentativas: 1,
        erro: 'grande demais',
      });
    });
  });
});
