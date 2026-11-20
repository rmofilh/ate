import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import type { DrizzleAppDb } from '../../../infrastructure/database/sqlite/DrizzleDb';
import { ExecutorDeTransacao } from '../../../infrastructure/database/sqlite/ExecutorDeTransacao';
import {
  clientes,
  eventos,
  filaSync,
  fotos,
  obras,
  pedidos,
} from '../../../infrastructure/database/sqlite/schema';
import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import { ServidorEmMemoria } from '../../../test-support/servidorEmMemoria';
import { makeSqliteProviders, type SqliteProviderBag } from '../../factories/makeSqliteProviders';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';

function aparelho(servidor: ServidorEmMemoria): { db: DrizzleAppDb; bag: SqliteProviderBag } {
  const db = bancoDeTeste();
  const bag = makeSqliteProviders(db, new ExecutorDeTransacao(db), new FakeAuthGateway(), {
    servidor,
    armazenamento: servidor.armazenamento,
  });
  bag.registrarSessao({ userId: USUARIO, token: 't' });
  return { db, bag };
}

/** Foto aceita na câmera: arquivo em fotos/ e linha PENDENTE_UPLOAD (como o ArmazenamentoDeFotos). */
async function fotoTirada(db: DrizzleAppDb, id: string): Promise<string> {
  const caminho = `fotos/${id}.jpg`;
  fsDeTeste.escrever(`file:///docs/${caminho}`, `jpeg-${id}`);
  await db.insert(fotos).values({
    id,
    caminhoLocal: caminho,
    hash: 'h',
    status: 'PENDENTE_UPLOAD',
    criadoEmLocal: new Date().toISOString(),
  });
  return caminho;
}

async function cenarioCompleto(bag: SqliteProviderBag, db: DrizzleAppDb) {
  const cliente = await bag.useCases.cadastrarCliente.execute({
    usuarioId: USUARIO,
    nome: 'Ana',
    contato: '(31) 90000-0000',
  });
  const fotoCatalogo = await fotoTirada(db, 'f0000000-0000-4000-8000-000000000001');
  const obra = await bag.useCases.cadastrarObra.execute({
    usuarioId: USUARIO,
    nome: 'Coruja',
    tipo: 'UNICA',
    fotoPath: fotoCatalogo,
  });
  const pedido = await bag.useCases.cadastrarPedido.execute({
    usuarioId: USUARIO,
    clienteId: cliente.id,
    descricao: 'Coruja de barro',
    canalOrigem: 'INSTAGRAM',
    dataEntrega: new Date('2026-11-20T03:00:00.000Z'),
    obraId: obra.id,
  });
  await bag.useCases.iniciarProducao.execute({ pedidoId: pedido.id });
  const fotoConclusao = await fotoTirada(db, 'f0000000-0000-4000-8000-000000000002');
  await bag.useCases.concluirPedido.execute({ pedidoId: pedido.id, fotoPath: fotoConclusao });
  await bag.useCases.cadastrarEvento.execute({
    usuarioId: USUARIO,
    nome: 'Feira da Afonso Pena',
    data: new Date('2026-11-22T12:00:00.000Z'),
    endereco: 'Av. Afonso Pena, BH',
    localizacao: undefined,
    usarGps: true,
  });
  return { cliente, obra, pedido };
}

describe('sincronização de ponta a ponta (SQLite real + servidor em memória)', () => {
  beforeEach(() => fsDeTeste.limpar());

  it('sobe fotos primeiro, depois registros; fila vazia e tudo SINCRONIZADO', async () => {
    const servidor = new ServidorEmMemoria();
    const { db, bag } = aparelho(servidor);
    bag.motorDeSync!.parar();
    const { pedido } = await cenarioCompleto(bag, db);
    bag.motorDeSync!.parar();

    const resultado = await bag.motorDeSync!.sincronizarAgora();

    expect(resultado).toMatchObject({ fotosEnviadas: 2, falhas: 0, semRede: false });
    expect(await db.select().from(filaSync)).toEqual([]);
    for (const tabela of [clientes, obras, pedidos]) {
      const linhas = await db.select().from(tabela);
      expect(linhas.every((l) => l.statusSync === 'SINCRONIZADO' && l.updatedAt)).toBe(true);
    }
    const remoto = servidor.linhas('pedidos').find((l) => l.id === pedido.id)!.dados;
    expect(remoto).toMatchObject({
      status: 'FEITO',
      foto_conclusao_path: `${USUARIO}/f0000000-0000-4000-8000-000000000002.jpg`,
      usuario_id: USUARIO,
      venda_direta: false,
    });
    expect(servidor.bucket.has(`${USUARIO}/f0000000-0000-4000-8000-000000000001.jpg`)).toBe(true);
    expect(bag.motorDeSync!.obterEstado()).toMatchObject({ pendentes: 0, falhas: 0 });
  });

  it('modo avião: nada sai, nada se perde; com a rede de volta tudo sobe', async () => {
    const servidor = new ServidorEmMemoria();
    const { db, bag } = aparelho(servidor);
    await cenarioCompleto(bag, db);
    bag.motorDeSync!.parar();
    servidor.semRede = true;

    const offline = await bag.motorDeSync!.sincronizarAgora();

    expect(offline?.semRede).toBe(true);
    expect(bag.motorDeSync!.obterEstado()).toMatchObject({ semRede: true });
    expect((await db.select().from(filaSync)).length).toBeGreaterThan(0);
    expect(servidor.linhas('pedidos')).toEqual([]);

    servidor.semRede = false;
    await bag.motorDeSync!.sincronizarAgora();

    expect(await db.select().from(filaSync)).toEqual([]);
    expect(servidor.linhas('pedidos')).toHaveLength(1);
    expect(bag.motorDeSync!.obterEstado().semRede).toBe(false);
  });

  it('reinstalação: aparelho vazio entra e recebe dados e fotos do servidor', async () => {
    const servidor = new ServidorEmMemoria();
    const antigo = aparelho(servidor);
    const { pedido, obra } = await cenarioCompleto(antigo.bag, antigo.db);
    antigo.bag.motorDeSync!.parar();
    await antigo.bag.motorDeSync!.sincronizarAgora();

    fsDeTeste.limpar(); // o app foi desinstalado: as fotos do aparelho somem
    const novo = aparelho(servidor);
    // O app abre e carrega os dados antes do primeiro pull (cria um Cliente Avulso local).
    await novo.bag.loadData();
    await novo.bag.motorDeSync!.sincronizarAgora();
    await novo.bag.motorDeSync!.sincronizarAgora(); // sobe o tombstone do balcão duplicado

    const dados = await novo.bag.loadData();
    expect(dados.pedidos.map((p) => p.id)).toEqual([pedido.id]);
    expect(dados.pedidos[0]).toMatchObject({
      status: 'FEITO',
      fotoConclusaoPath: 'fotos/f0000000-0000-4000-8000-000000000002.jpg',
    });
    expect(dados.pedidos[0].dataEntrega.toISOString()).toBe('2026-11-20T03:00:00.000Z');
    expect(dados.obras.map((o) => o.id)).toEqual([obra.id]);
    expect(dados.eventos).toHaveLength(1);
    expect(dados.clientes.map((c) => c.nome).sort()).toEqual(['Ana', 'Cliente Avulso']);
    expect(fsDeTeste.existe('file:///docs/fotos/f0000000-0000-4000-8000-000000000002.jpg')).toBe(
      true,
    );
    expect(fsDeTeste.existe('file:///docs/fotos/f0000000-0000-4000-8000-000000000001.jpg')).toBe(
      true,
    );
    // Um único Cliente Avulso vivo também no servidor.
    const balcoesVivos = servidor
      .linhas('clientes')
      .filter((l) => l.dados.nome === 'Cliente Avulso' && !l.dados.deleted_at);
    expect(balcoesVivos).toHaveLength(1);
  });

  it('pedido do Cliente Avulso local é reapontado para o balcão do servidor', async () => {
    const servidor = new ServidorEmMemoria();
    const antigo = aparelho(servidor);
    await antigo.bag.loadData();
    antigo.bag.motorDeSync!.parar();
    await antigo.bag.motorDeSync!.sincronizarAgora();
    const balcaoDoServidor = servidor.linhas('clientes')[0].id;

    const novo = aparelho(servidor);
    const obra = await novo.bag.useCases.cadastrarObra.execute({
      usuarioId: USUARIO,
      nome: 'Vaso',
      tipo: 'SERIE',
      quantidade: 3,
    });
    await novo.bag.useCases.vendaDireta.execute({ usuarioId: USUARIO, obraId: obra.id, qtd: 1 });
    novo.bag.motorDeSync!.parar();
    await novo.bag.motorDeSync!.sincronizarAgora();
    await novo.bag.motorDeSync!.sincronizarAgora();

    const [venda] = (await novo.bag.loadData()).pedidos;
    expect(venda.clienteId).toBe(balcaoDoServidor);
    const remoto = servidor.linhas('pedidos').find((l) => l.id === venda.id)!.dados;
    expect(remoto.cliente_id).toBe(balcaoDoServidor);
  });

  it('pedido FEITO cuja foto ainda não subiu espera; nunca chega sem foto ao servidor', async () => {
    const servidor = new ServidorEmMemoria();
    const { db, bag } = aparelho(servidor);
    const { pedido } = await cenarioCompleto(bag, db);
    bag.motorDeSync!.parar();
    const enviarFoto = servidor.armazenamento.enviar;
    servidor.armazenamento.enviar = async (local, remoto) => {
      if (local.endsWith('000000000002.jpg')) throw new Error('falha no upload');
      return enviarFoto(local, remoto);
    };

    await bag.motorDeSync!.sincronizarAgora();

    expect(servidor.linhas('pedidos')).toEqual([]);
    const [local] = await db.select().from(pedidos);
    expect(local.statusSync).toBe('PENDENTE');

    servidor.armazenamento.enviar = enviarFoto;
    await bag.motorDeSync!.sincronizarAgora();
    expect(servidor.linhas('pedidos').map((l) => l.id)).toEqual([pedido.id]);
  });

  it('escrita do usuário agenda um ciclo (debounce)', async () => {
    jest.useFakeTimers();
    try {
      const servidor = new ServidorEmMemoria();
      const { bag } = aparelho(servidor);
      const ciclo = jest.spyOn(bag.motorDeSync!, 'sincronizarAgora');

      await bag.useCases.cadastrarCliente.execute({ usuarioId: USUARIO, nome: 'A', contato: '1' });
      await bag.useCases.cadastrarCliente.execute({ usuarioId: USUARIO, nome: 'B', contato: '2' });
      expect(ciclo).not.toHaveBeenCalled();

      jest.advanceTimersByTime(3_000);
      expect(ciclo).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('sem sessão o motor não faz nada', async () => {
    const servidor = new ServidorEmMemoria();
    const { bag } = aparelho(servidor);
    bag.registrarSessao(null);
    await expect(bag.motorDeSync!.sincronizarAgora()).resolves.toBeNull();
  });

  it('ciclo que gerou fila nova (balcão duplicado) agenda outro e converge sozinho', async () => {
    jest.useFakeTimers();
    try {
      const servidor = new ServidorEmMemoria();
      const antigo = aparelho(servidor);
      await antigo.bag.loadData();
      antigo.bag.motorDeSync!.parar();
      await antigo.bag.motorDeSync!.sincronizarAgora();

      const novo = aparelho(servidor);
      await novo.bag.loadData(); // reinstalação: balcão local novo antes do primeiro pull
      await novo.bag.motorDeSync!.sincronizarAgora();
      expect(novo.bag.motorDeSync!.obterEstado().pendentes).toBe(1);

      await jest.advanceTimersByTimeAsync(3_000);

      const vivos = servidor
        .linhas('clientes')
        .filter((l) => l.dados.nome === 'Cliente Avulso' && !l.dados.deleted_at);
      expect(vivos).toHaveLength(1);
      expect(novo.bag.motorDeSync!.obterEstado().pendentes).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('evento criado offline fica SINCRONIZADO depois que a rede volta (regressão do aparelho)', async () => {
    const servidor = new ServidorEmMemoria();
    const { db, bag } = aparelho(servidor);
    servidor.semRede = true;
    const evento = await bag.useCases.cadastrarEvento.execute({
      usuarioId: USUARIO,
      nome: 'zoomer',
      data: new Date('2026-11-25T12:00:00.000Z'),
      endereco: 'Praça',
      localizacao: undefined,
      usarGps: true,
    });
    bag.motorDeSync!.parar();
    await bag.motorDeSync!.sincronizarAgora();

    servidor.semRede = false;
    await bag.motorDeSync!.sincronizarAgora();

    expect(servidor.linhas('eventos').map((l) => l.id)).toEqual([evento.id]);
    const [local] = await db.select().from(eventos);
    expect(local.statusSync).toBe('SINCRONIZADO');
    const [carregado] = (await bag.loadData()).eventos;
    expect(carregado.statusSync).toBe('SINCRONIZADO');
  });

  it('autocorreção: evento no servidor mas preso em PENDENTE no aparelho volta a SINCRONIZADO', async () => {
    const servidor = new ServidorEmMemoria();
    const { db, bag } = aparelho(servidor);
    await bag.useCases.cadastrarEvento.execute({
      usuarioId: USUARIO,
      nome: 'zoomer',
      data: new Date('2026-11-25T12:00:00.000Z'),
      endereco: 'Praça',
      usarGps: true,
    });
    bag.motorDeSync!.parar();
    await bag.motorDeSync!.sincronizarAgora();
    // O estado visto no aparelho: já no servidor, fila vazia, mas a linha ficou PENDENTE.
    await db.update(eventos).set({ statusSync: 'PENDENTE' });
    expect(await db.select().from(filaSync)).toEqual([]);

    await bag.motorDeSync!.sincronizarAgora();

    const [local] = await db.select().from(eventos);
    expect(local.statusSync).toBe('SINCRONIZADO');
    expect(await db.select().from(filaSync)).toEqual([]);
    expect(servidor.linhas('eventos')).toHaveLength(1);
  });
});
