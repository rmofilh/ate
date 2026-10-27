import { eq, sql } from 'drizzle-orm';

import { Cliente } from '../../../../core/domain/entities/Cliente';
import { Obra } from '../../../../core/domain/entities/Obra';
import { Pedido, type PedidoProps } from '../../../../core/domain/entities/Pedido';
import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import { gerarIdTeste } from '../../../../test-support/ids';
import type { DrizzleAppDb } from '../DrizzleDb';
import { pedidos } from '../schema';
import { SQLiteClienteRepository } from '../SQLiteClienteRepository';
import { SQLiteObraRepository } from '../SQLiteObraRepository';
import { SQLitePedidoRepository } from '../SQLitePedidoRepository';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO = 'b1111111-1111-4111-8111-111111111111';

function props(p: Pedido): PedidoProps {
  return {
    id: p.id,
    usuarioId: p.usuarioId,
    clienteId: p.clienteId,
    obraId: p.obraId,
    descricao: p.descricao,
    canalOrigem: p.canalOrigem,
    dataEntrega: p.dataEntrega,
    status: p.status,
    fotoConclusaoPath: p.fotoConclusaoPath,
    vendaDireta: p.vendaDireta,
    quantidadeObra: p.quantidadeObra,
    statusSync: p.statusSync,
    criadoEmLocal: p.criadoEmLocal,
    deletedAt: p.deletedAt,
  };
}

describe('SQLitePedidoRepository', () => {
  let db: DrizzleAppDb;
  let repo: SQLitePedidoRepository;
  let cliente: Cliente;
  let obra: Obra;

  beforeEach(async () => {
    db = bancoDeTeste();
    repo = new SQLitePedidoRepository(db);
    cliente = Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'Ana', contato: '1' });
    obra = Obra.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome: 'Coruja', tipo: 'SERIE', quantidade: 5 });
    await new SQLiteClienteRepository(db).save(cliente);
    await new SQLiteObraRepository(db).save(obra);
  });

  function pedidoCom(override: Partial<PedidoProps> = {}): Pedido {
    return Pedido.reidratar({
      id: gerarIdTeste(),
      usuarioId: USUARIO,
      clienteId: cliente.id,
      obraId: null,
      descricao: 'Escultura de onça',
      canalOrigem: 'INSTAGRAM',
      dataEntrega: new Date('2026-11-01T12:00:00.000Z'),
      status: 'A_FAZER',
      fotoConclusaoPath: null,
      vendaDireta: false,
      quantidadeObra: 0,
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date('2026-10-01T10:11:12.345Z'),
      deletedAt: null,
      ...override,
    });
  }

  it.each<[string, () => Partial<PedidoProps>]>([
    ['sem obra', () => ({})],
    ['com obra vinculada', () => ({ obraId: obra.id, quantidadeObra: 1, canalOrigem: 'WHATSAPP' })],
    ['em produção', () => ({ status: 'FAZENDO', canalOrigem: 'TELEFONE', statusSync: 'SINCRONIZADO' })],
    ['concluído com foto', () => ({ status: 'FEITO', fotoConclusaoPath: 'fotos/p.jpg', statusSync: 'ERRO' })],
    [
      'venda direta de N unidades',
      () => ({ status: 'FEITO', vendaDireta: true, obraId: obra.id, quantidadeObra: 3, canalOrigem: 'PRESENCIAL' }),
    ],
    ['canal OUTROS', () => ({ canalOrigem: 'OUTROS' })],
  ])('roundtrip campo a campo: %s', async (_, override) => {
    const pedido = pedidoCom(override());
    await repo.save(pedido);

    const lido = await repo.findById(pedido.id);
    expect(lido).toBeInstanceOf(Pedido);
    expect(props(lido!)).toEqual(props(pedido));
  });

  it('update por upsert altera campos e preserva updated_at', async () => {
    const pedido = pedidoCom();
    await repo.save(pedido);
    await db.run(sql`UPDATE pedidos SET updated_at = '2026-10-02T00:00:00.000Z' WHERE id = ${pedido.id}`);

    pedido.editar('Escultura de onça pintada', new Date('2026-12-01T12:00:00.000Z'));
    await repo.save(pedido);

    const [linha] = await db.select().from(pedidos).where(eq(pedidos.id, pedido.id));
    expect(linha.descricao).toBe('Escultura de onça pintada');
    expect(linha.dataEntrega).toBe('2026-12-01T12:00:00.000Z');
    expect(linha.updatedAt).toBe('2026-10-02T00:00:00.000Z');
  });

  it('fluxo criar → save → moverParaFazendo → save persiste', async () => {
    const pedido = Pedido.criar({
      id: gerarIdTeste(),
      usuarioId: USUARIO,
      clienteId: cliente.id,
      descricao: 'Vaso',
      canalOrigem: 'WHATSAPP',
      dataEntrega: new Date('2026-11-10T12:00:00.000Z'),
    });
    await repo.save(pedido);
    const lido = await repo.findById(pedido.id);
    lido!.moverParaFazendo();
    await repo.save(lido!);

    expect((await repo.findById(pedido.id))?.status).toBe('FAZENDO');
  });

  it('tombstone some das leituras e continua no banco', async () => {
    const pedido = pedidoCom();
    await repo.save(pedido);
    pedido.cancelar();
    await repo.save(pedido);

    expect(await repo.findById(pedido.id)).toBeNull();
    expect(await repo.findByUsuario(USUARIO)).toEqual([]);
    expect(await repo.findByStatus(USUARIO, 'A_FAZER')).toEqual([]);
    const [linha] = await db.select().from(pedidos).where(eq(pedidos.id, pedido.id));
    expect(linha.deletedAt).toBe(pedido.deletedAt!.toISOString());
  });

  it('findByUsuario e findByStatus isolam usuário e status', async () => {
    const aFazer = pedidoCom();
    const fazendo = pedidoCom({ status: 'FAZENDO' });
    const outroCliente = Cliente.criar({ id: gerarIdTeste(), usuarioId: OUTRO_USUARIO, nome: 'B', contato: '1' });
    await new SQLiteClienteRepository(db).save(outroCliente);
    const deOutro = pedidoCom({ usuarioId: OUTRO_USUARIO, clienteId: outroCliente.id });
    await repo.save(aFazer);
    await repo.save(fazendo);
    await repo.save(deOutro);

    expect((await repo.findByUsuario(USUARIO)).map((p) => p.id).sort()).toEqual(
      [aFazer.id, fazendo.id].sort(),
    );
    expect((await repo.findByStatus(USUARIO, 'FAZENDO')).map((p) => p.id)).toEqual([fazendo.id]);
    expect(await repo.findByStatus(USUARIO, 'FEITO')).toEqual([]);
  });

  it('FK: pedido com cliente inexistente falha', async () => {
    await expect(repo.save(pedidoCom({ clienteId: gerarIdTeste() }))).rejects.toThrow(/FOREIGN KEY/);
  });

  it('FK: pedido com obra inexistente falha', async () => {
    await expect(
      repo.save(pedidoCom({ obraId: gerarIdTeste(), quantidadeObra: 1 })),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
