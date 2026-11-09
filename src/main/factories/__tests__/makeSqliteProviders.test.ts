import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import { ExecutorDeTransacao } from '../../../infrastructure/database/sqlite/ExecutorDeTransacao';
import type { DrizzleAppDb } from '../../../infrastructure/database/sqlite/DrizzleDb';
import { clientes, filaSync, fotos, obras, pedidos, syncMeta } from '../../../infrastructure/database/sqlite/schema';
import { ExpoCameraGateway } from '../../../infrastructure/device/camera/ExpoCameraGateway';
import { ExpoGeocodingGateway } from '../../../infrastructure/device/location/ExpoGeocodingGateway';
import { ExpoLocationGateway } from '../../../infrastructure/device/location/ExpoLocationGateway';
import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import { DadosDeOutroUsuarioError } from '../../auth/protegerDonoDosDados';
import { makeSqliteProviders, type SqliteProviderBag } from '../makeSqliteProviders';
import { SessaoNaoDisponivelError } from '../SessaoNaoDisponivelError';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const OUTRO = 'b2222222-2222-4222-8222-222222222222';

describe('makeSqliteProviders (SQLite real)', () => {
  let db: DrizzleAppDb;
  let bag: SqliteProviderBag;

  beforeEach(() => {
    db = bancoDeTeste();
    bag = makeSqliteProviders(
      db,
      new ExecutorDeTransacao(db),
      new FakeAuthGateway(
        new Map([
          ['a@ate.app', { password: '1', userId: USUARIO }],
          ['b@ate.app', { password: '2', userId: OUTRO }],
        ]),
      ),
    );
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
    expect(dados.clientes.map((c) => c.nome)).toEqual(['Ana', 'Cliente Avulso']);
    expect(dados.obras.map((o) => o.statusObra)).toEqual(['RESERVADA']);
    expect(dados.pedidos).toHaveLength(1);
    expect(dados.pedidos[0].obraId).toBe(obra.id);
    expect(await fila()).toEqual([
      'CRIAR Cliente', 'CRIAR Obra', 'EDITAR Obra', 'CRIAR Pedido', 'CRIAR Cliente',
    ]);
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

  it('loadData garante o Cliente Avulso uma única vez, sem nunca ter havido venda direta', async () => {
    const primeira = await bag.loadData();
    const segunda = await bag.loadData();

    expect(primeira.clientes.map((c) => c.nome)).toEqual(['Cliente Avulso']);
    expect(segunda.clientes.map((c) => c.id)).toEqual(primeira.clientes.map((c) => c.id));
    expect(await fila()).toEqual(['CRIAR Cliente']);
  });

  it('venda direta reaproveita o Cliente Avulso criado pelo loadData', async () => {
    await bag.loadData();
    const obra = await bag.useCases.cadastrarObra.execute({
      usuarioId: USUARIO,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 5,
    });

    await bag.useCases.vendaDireta.execute({ usuarioId: USUARIO, obraId: obra.id, qtd: 1 });

    expect(await db.select().from(clientes)).toHaveLength(1);
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

  it('leitura fica sem decorator; login ganha só o D4 (sem transação)', () => {
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.consultarPedidos, 'execute')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.login, 'execute')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(bag.useCases.cadastrarPedido, 'execute')).toBe(true);
  });

  it('usa a câmera real e expõe a mesma instância como ponte para a UI', () => {
    expect(bag.gateways.camera).toBeInstanceOf(ExpoCameraGateway);
    expect(bag.ponteDaCamera).toBe(bag.gateways.camera);
  });

  it('usa o GPS e a busca de endereço reais (expo-location) no runtime', () => {
    expect(bag.gateways.location).toBeInstanceOf(ExpoLocationGateway);
    expect(bag.gateways.geocodificador).toBeInstanceOf(ExpoGeocodingGateway);
  });

  it('aoIniciar remove fotos órfãs antigas', async () => {
    fsDeTeste.limpar();
    await db.insert(fotos).values({
      id: 'f1',
      caminhoLocal: 'fotos/f1.jpg',
      hash: 'h',
      criadoEmLocal: '2020-01-01T00:00:00.000Z',
    });
    fsDeTeste.escrever('file:///docs/fotos/f1.jpg', 'x', 0);

    await bag.aoIniciar();

    expect(await db.select().from(fotos)).toEqual([]);
    expect(fsDeTeste.existe('file:///docs/fotos/f1.jpg')).toBe(false);
  });

  it('login registra o dono e bloqueia outra conta com dados locais (D4)', async () => {
    await bag.useCases.login.execute({ email: 'a@ate.app', password: '1' });
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });
    await bag.useCases.logout.execute();

    await expect(
      bag.useCases.login.execute({ email: 'b@ate.app', password: '2' }),
    ).rejects.toBeInstanceOf(DadosDeOutroUsuarioError);
    await expect(bag.gateways.auth.getSession()).resolves.toBeNull();
    expect(await db.select().from(obras)).toHaveLength(1);
  });

  it('apagarDadosEEntrar autentica antes; senha errada não apaga nada', async () => {
    await bag.useCases.login.execute({ email: 'a@ate.app', password: '1' });
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });
    await bag.useCases.logout.execute();

    await expect(bag.apagarDadosEEntrar({ email: 'b@ate.app', password: 'x' })).rejects.toThrow(
      'E-mail ou senha incorretos',
    );
    expect(await db.select().from(obras)).toHaveLength(1);
  });

  it('apagarDadosEEntrar zera banco e fotos e registra a nova conta como dona', async () => {
    await bag.useCases.login.execute({ email: 'a@ate.app', password: '1' });
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });
    fsDeTeste.escrever('file:///docs/fotos/antiga.jpg');
    await bag.useCases.logout.execute();

    await expect(
      bag.apagarDadosEEntrar({ email: 'b@ate.app', password: '2' }),
    ).resolves.toMatchObject({ userId: OUTRO });

    expect(await db.select().from(obras)).toEqual([]);
    expect(await db.select().from(filaSync)).toEqual([]);
    expect(await db.select().from(syncMeta)).toEqual([{ chave: 'dono_dos_dados', valor: OUTRO }]);
    expect(fsDeTeste.existe('file:///docs/fotos/antiga.jpg')).toBe(false);
    await expect(bag.gateways.auth.getSession()).resolves.toMatchObject({ userId: OUTRO });
  });
});
