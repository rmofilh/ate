import { eq, sql } from 'drizzle-orm';

import { Cliente } from '../../../../core/domain/entities/Cliente';
import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import { gerarIdTeste } from '../../../../test-support/ids';
import type { DrizzleAppDb } from '../DrizzleDb';
import { clientes } from '../schema';
import { SQLiteClienteRepository } from '../SQLiteClienteRepository';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO = 'b1111111-1111-4111-8111-111111111111';

function campos(c: Cliente) {
  return {
    id: c.id,
    usuarioId: c.usuarioId,
    nome: c.nome,
    contato: c.contato,
    statusSync: c.statusSync,
    criadoEmLocal: c.criadoEmLocal.toISOString(),
    deletedAt: c.deletedAt?.toISOString() ?? null,
  };
}

describe('SQLiteClienteRepository', () => {
  let db: DrizzleAppDb;
  let repo: SQLiteClienteRepository;

  beforeEach(() => {
    db = bancoDeTeste();
    repo = new SQLiteClienteRepository(db);
  });

  it.each(['PENDENTE', 'SINCRONIZADO', 'ERRO'] as const)(
    'roundtrip campo a campo com statusSync %s',
    async (statusSync) => {
      const cliente = Cliente.reidratar({
        id: gerarIdTeste(),
        usuarioId: USUARIO,
        nome: 'Ana Souza',
        contato: '(11) 98888-7777',
        statusSync,
        criadoEmLocal: new Date('2026-10-01T10:11:12.345Z'),
        deletedAt: null,
      });
      await repo.save(cliente);

      const lido = await repo.findById(cliente.id);
      expect(lido).toBeInstanceOf(Cliente);
      expect(campos(lido!)).toEqual(campos(cliente));
    },
  );

  it('update por upsert altera campos e preserva updated_at', async () => {
    const cliente = Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'Ana', contato: '1' });
    await repo.save(cliente);
    await db.run(
      sql`UPDATE clientes SET updated_at = '2026-10-02T00:00:00.000Z' WHERE id = ${cliente.id}`,
    );

    cliente.editar('Ana Maria', '2');
    await repo.save(cliente);

    const [linha] = await db.select().from(clientes).where(eq(clientes.id, cliente.id));
    expect(linha.nome).toBe('Ana Maria');
    expect(linha.contato).toBe('2');
    expect(linha.updatedAt).toBe('2026-10-02T00:00:00.000Z');
    expect(await db.select().from(clientes)).toHaveLength(1);
  });

  it('tombstone some das leituras e continua no banco', async () => {
    const cliente = Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'Ana', contato: '1' });
    await repo.save(cliente);
    cliente.marcarRemovido();
    await repo.save(cliente);

    expect(await repo.findById(cliente.id)).toBeNull();
    expect(await repo.findByUsuario(USUARIO)).toEqual([]);
    const [linha] = await db.select().from(clientes).where(eq(clientes.id, cliente.id));
    expect(linha.deletedAt).toBe(cliente.deletedAt!.toISOString());
  });

  it('findByUsuario isola por usuário e ordena por criação', async () => {
    const segundo = Cliente.reidratar({
      ...campos(Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'B', contato: '1' })),
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date('2026-10-02T00:00:00.000Z'),
      deletedAt: null,
    });
    const primeiro = Cliente.reidratar({
      ...campos(segundo),
      id: gerarIdTeste(),
      nome: 'A',
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date('2026-10-01T00:00:00.000Z'),
      deletedAt: null,
    });
    const deOutro = Cliente.criar({ id: gerarIdTeste(), usuarioId: OUTRO_USUARIO, nome: 'C', contato: '1' });
    await repo.save(segundo);
    await repo.save(deOutro);
    await repo.save(primeiro);

    const lidos = await repo.findByUsuario(USUARIO);
    expect(lidos.map((c) => c.nome)).toEqual(['A', 'B']);
  });

  describe('cliente balcão', () => {
    it('findBalcaoByUsuario encontra só o balcão vivo do usuário', async () => {
      const comum = Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'Ana', contato: '1' });
      const balcaoOutro = Cliente.balcao({ id: gerarIdTeste(), usuarioId: OUTRO_USUARIO });
      await repo.save(comum);
      await repo.save(balcaoOutro);
      expect(await repo.findBalcaoByUsuario(USUARIO)).toBeNull();

      const balcao = Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO });
      await repo.save(balcao);
      expect((await repo.findBalcaoByUsuario(USUARIO))?.id).toBe(balcao.id);

      balcao.marcarRemovido();
      await repo.save(balcao);
      expect(await repo.findBalcaoByUsuario(USUARIO)).toBeNull();
    });

    it('saveBalcaoIfAbsent cria uma vez e depois devolve o existente', async () => {
      const primeiro = Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO });
      const segundo = Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO });

      const r1 = await repo.saveBalcaoIfAbsent(primeiro);
      const r2 = await repo.saveBalcaoIfAbsent(segundo);

      expect(r1).toEqual({ cliente: expect.any(Cliente), created: true });
      expect(r1.cliente.id).toBe(primeiro.id);
      expect(r2.created).toBe(false);
      expect(r2.cliente.id).toBe(primeiro.id);
      expect(await db.select().from(clientes)).toHaveLength(1);
    });

    it('save() direto de um segundo balcão viola o índice único', async () => {
      await repo.save(Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO }));
      await expect(
        repo.save(Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO })),
      ).rejects.toThrow(/UNIQUE/);
    });
  });
});
