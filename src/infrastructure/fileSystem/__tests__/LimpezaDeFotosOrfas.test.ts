import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../test-support/ids';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import type { DrizzleAppDb } from '../../database/sqlite/DrizzleDb';
import { clientes, fotos, obras, pedidos } from '../../database/sqlite/schema';
import { ArmazenamentoDeFotos } from '../ArmazenamentoDeFotos';

const AGORA = new Date('2026-11-05T12:00:00.000Z');
const ANTIGA = '2026-11-03T12:00:00.000Z'; // 48 h antes
const RECENTE = '2026-11-05T06:00:00.000Z'; // 6 h antes
const MS_ANTIGA = new Date(ANTIGA).getTime();
const MS_RECENTE = new Date(RECENTE).getTime();
const USUARIO = 'a1111111-1111-4111-8111-111111111111';

describe('ArmazenamentoDeFotos.limparOrfas', () => {
  let db: DrizzleAppDb;
  let armazenamento: ArmazenamentoDeFotos;

  beforeEach(() => {
    fsDeTeste.limpar();
    db = bancoDeTeste();
    armazenamento = new ArmazenamentoDeFotos(db, idsTeste, () => AGORA);
  });

  async function foto(
    caminho: string,
    criadoEmLocal: string,
    status: 'PENDENTE_UPLOAD' | 'ENVIADA' = 'PENDENTE_UPLOAD',
  ) {
    await db.insert(fotos).values({
      id: caminho,
      caminhoLocal: caminho,
      hash: 'h',
      status,
      criadoEmLocal,
    });
    fsDeTeste.escrever(`file:///docs/${caminho}`, 'jpeg', new Date(criadoEmLocal).getTime());
  }

  async function cliente(): Promise<string> {
    await db.insert(clientes).values({
      id: 'c1',
      usuarioId: USUARIO,
      nome: 'Ana',
      contato: '1',
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
    });
    return 'c1';
  }

  async function caminhosRegistrados(): Promise<string[]> {
    return (await db.select().from(fotos)).map((l) => l.caminhoLocal).sort();
  }

  it('remove linha e arquivo da órfã PENDENTE_UPLOAD com mais de 24 h', async () => {
    await foto('fotos/orfa.jpg', ANTIGA);

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(await caminhosRegistrados()).toEqual([]);
    expect(fsDeTeste.existe('file:///docs/fotos/orfa.jpg')).toBe(false);
  });

  it('mantém órfã recente (menos de 24 h)', async () => {
    await foto('fotos/recente.jpg', RECENTE);

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/recente.jpg']);
    expect(fsDeTeste.existe('file:///docs/fotos/recente.jpg')).toBe(true);
  });

  it('mantém foto usada por pedido, mesmo removido (tombstone), e por obra', async () => {
    await foto('fotos/pedido.jpg', ANTIGA);
    await foto('fotos/obra.jpg', ANTIGA);
    const clienteId = await cliente();
    await db.insert(pedidos).values({
      id: 'p1',
      usuarioId: USUARIO,
      clienteId,
      descricao: 'Vaso',
      canalOrigem: 'WHATSAPP',
      dataEntrega: ANTIGA,
      status: 'FEITO',
      fotoConclusaoPath: 'fotos/pedido.jpg',
      vendaDireta: false,
      quantidadeObra: 0,
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
      deletedAt: RECENTE,
    });
    await db.insert(obras).values({
      id: 'o1',
      usuarioId: USUARIO,
      nome: 'Coruja',
      tipo: 'UNICA',
      quantidade: 1,
      statusObra: 'DISPONIVEL',
      fotoPath: 'fotos/obra.jpg',
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
    });

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/obra.jpg', 'fotos/pedido.jpg']);
  });

  it('não mexe em foto já ENVIADA', async () => {
    await foto('fotos/enviada.jpg', ANTIGA, 'ENVIADA');

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/enviada.jpg']);
  });

  it('remove a linha órfã mesmo se o arquivo já não existe', async () => {
    await foto('fotos/sem-arquivo.jpg', ANTIGA);
    fsDeTeste.limpar();

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(await caminhosRegistrados()).toEqual([]);
  });

  it('apaga arquivo solto antigo em fotos/ sem linha no banco e mantém o recente', async () => {
    await foto('fotos/registrada.jpg', ANTIGA, 'ENVIADA');
    fsDeTeste.escrever('file:///docs/fotos/solta-antiga.jpg', 'x', MS_ANTIGA);
    fsDeTeste.escrever('file:///docs/fotos/solta-recente.jpg', 'x', MS_RECENTE);

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(fsDeTeste.uris()).toEqual([
      'file:///docs/fotos/registrada.jpg',
      'file:///docs/fotos/solta-recente.jpg',
    ]);
  });

  it('sem pasta fotos/ não falha', async () => {
    await expect(armazenamento.limparOrfas()).resolves.toBe(0);
  });
});
