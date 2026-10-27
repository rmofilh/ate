import { ExecutorDeTransacao } from '../../../infrastructure/database/sqlite/ExecutorDeTransacao';
import type { DrizzleAppDb } from '../../../infrastructure/database/sqlite/DrizzleDb';
import { clientes, filaSync, pedidos } from '../../../infrastructure/database/sqlite/schema';
import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { makeSqliteProviders, type SqliteProviderBag } from '../makeSqliteProviders';
import { SessaoNaoDisponivelError } from '../SessaoNaoDisponivelError';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';

describe('makeSqliteProviders (SQLite real)', () => {
  let db: DrizzleAppDb;
  let bag: SqliteProviderBag;

  beforeEach(() => {
    db = bancoDeTeste();
    bag = makeSqliteProviders(db, new ExecutorDeTransacao(db));
    bag.registrarSessao({ userId: USUARIO, token: 'x' });
  });

  async function fila() {
    return (await db.select().from(filaSync)).map((l) => `${l.tipoOperacao} ${l.entidade}`);
  }

  it('fluxo cliente → obra única → pedido vinculado persiste e enfileira', async () => {
    const cliente = await bag.useCases.cadastrarCliente.execute({
      usuarioId: bag.usuarioId,
      nome: 'Ana',
      contato: '(11) 90000-0000',
    });
    const obra = await bag.useCases.cadastrarObra.execute({
      usuarioId: bag.usuarioId,
      nome: 'Águia',
      tipo: 'UNICA',
    });
    await bag.useCases.cadastrarPedido.execute({
      usuarioId: bag.usuarioId,
      clienteId: cliente.id,
      descricao: 'Escultura',
      canalOrigem: 'INSTAGRAM',
      dataEntrega: new Date('2026-11-01T12:00:00.000Z'),
      obraId: obra.id,
    });

    const dados = await bag.loadData();
    expect(dados.clientes.map((c) => c.id)).toEqual([cliente.id]);
    expect(dados.obras.map((o) => o.statusObra)).toEqual(['RESERVADA']);
    expect(dados.pedidos).toHaveLength(1);
    expect(dados.pedidos[0].obraId).toBe(obra.id);
    expect(await fila()).toEqual(['CRIAR Cliente', 'CRIAR Obra', 'EDITAR Obra', 'CRIAR Pedido']);
  });

  it('falha no enqueue do pedido desfaz tudo: obra continua DISPONIVEL', async () => {
    const cliente = await bag.useCases.cadastrarCliente.execute({
      usuarioId: USUARIO,
      nome: 'Ana',
      contato: '1',
    });
    const obra = await bag.useCases.cadastrarObra.execute({
      usuarioId: USUARIO,
      nome: 'Águia',
      tipo: 'UNICA',
    });
    const filaAntes = await fila();
    const enqueueOriginal = bag.gateways.sync.enqueue.bind(bag.gateways.sync);
    jest.spyOn(bag.gateways.sync, 'enqueue').mockImplementation(async (tipo, entidade, ...resto) => {
      if (entidade === 'Pedido') throw new Error('disco cheio');
      return enqueueOriginal(tipo, entidade, ...resto);
    });

    await expect(
      bag.useCases.cadastrarPedido.execute({
        usuarioId: USUARIO,
        clienteId: cliente.id,
        descricao: 'Escultura',
        canalOrigem: 'WHATSAPP',
        dataEntrega: new Date('2026-11-01T12:00:00.000Z'),
        obraId: obra.id,
      }),
    ).rejects.toThrow('disco cheio');

    expect((await bag.repositories.obras.findById(obra.id))?.statusObra).toBe('DISPONIVEL');
    expect(await db.select().from(pedidos)).toHaveLength(0);
    expect(await fila()).toEqual(filaAntes);
  });

  it('sem sessão: usuarioId lança e loadData devolve vazio', async () => {
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });
    bag.registrarSessao(null);

    expect(() => bag.usuarioId).toThrow(SessaoNaoDisponivelError);
    await expect(bag.loadData()).resolves.toEqual({
      pedidos: [],
      obras: [],
      eventos: [],
      clientes: [],
    });
  });

  it('venda direta em paralelo cria o cliente balcão uma única vez', async () => {
    const obra = await bag.useCases.cadastrarObra.execute({
      usuarioId: USUARIO,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 5,
    });

    await Promise.all([
      bag.useCases.vendaDireta.execute({ usuarioId: USUARIO, obraId: obra.id, qtd: 1 }),
      bag.useCases.vendaDireta.execute({ usuarioId: USUARIO, obraId: obra.id, qtd: 2 }),
    ]);

    expect(await db.select().from(clientes)).toHaveLength(1);
    expect((await fila()).filter((f) => f === 'CRIAR Cliente')).toHaveLength(1);
    expect((await bag.repositories.obras.findById(obra.id))?.quantidade).toBe(2);
    expect(await db.select().from(pedidos)).toHaveLength(2);
  });

  it('casos de uso de leitura e login ficam sem decorator', () => {
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.consultarPedidos, 'execute')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.login, 'execute')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.cadastrarPedido, 'execute')).toBe(true);
  });
});
