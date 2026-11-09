import { downloadsDeTeste, fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import { SupabaseArmazenamentoRemoto } from '../SupabaseArmazenamentoRemoto';
import { SupabaseServidorRemoto } from '../SupabaseServidorRemoto';
import { traduzirErroSupabase } from '../traduzirErroSupabase';

/** Construtor de consulta do PostgREST dublado: registra as chamadas e resolve com `resposta`. */
function consultaFalsa(resposta: { data?: unknown; error?: unknown; status?: number }) {
  const chamadas: [string, unknown[]][] = [];
  const consulta: Record<string, unknown> = {};
  for (const metodo of ['upsert', 'select', 'single', 'or', 'order', 'limit']) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, args]);
      return consulta;
    };
  }
  consulta.then = (resolver: (valor: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, status: 200, ...resposta }).then(resolver);
  return { consulta, chamadas };
}

function servidorCom(resposta: Parameters<typeof consultaFalsa>[0]) {
  const { consulta, chamadas } = consultaFalsa(resposta);
  const from = jest.fn(() => consulta);
  return { servidor: new SupabaseServidorRemoto({ from } as never, 50), from, chamadas };
}

describe('SupabaseServidorRemoto', () => {
  it('enviar faz upsert por id e devolve o updated_at do servidor', async () => {
    const { servidor, from, chamadas } = servidorCom({
      data: { updated_at: '2026-11-10T12:00:00.123456+00:00' },
    });

    await expect(servidor.enviar('clientes', { id: 'c1', nome: 'Ana' })).resolves.toEqual({
      updatedAt: '2026-11-10T12:00:00.123456+00:00',
    });
    expect(from).toHaveBeenCalledWith('clientes');
    expect(chamadas[0]).toEqual(['upsert', [{ id: 'c1', nome: 'Ana' }, { onConflict: 'id' }]]);
    expect(chamadas[1]).toEqual(['select', ['updated_at']]);
  });

  it('pull sem cursor: tudo, ordenado por (updated_at, id), limitado', async () => {
    const linha = { id: 'c1', updated_at: '2026-11-10T12:00:00.1+00:00', nome: 'Ana' };
    const { servidor, chamadas } = servidorCom({ data: [linha] });

    await expect(servidor.buscarAlteracoes('clientes', null, 500)).resolves.toEqual([
      { id: 'c1', updatedAt: linha.updated_at, dados: linha },
    ]);
    expect(chamadas.map(([m]) => m)).toEqual(['select', 'order', 'order', 'limit']);
    expect(chamadas[3]).toEqual(['limit', [500]]);
  });

  it('pull com cursor composto, timestamp entre aspas e sem perder precisão', async () => {
    const { servidor, chamadas } = servidorCom({ data: [] });
    const cursor = { updatedAt: '2026-11-10T12:00:00.123456+00:00', id: 'c9' };

    await servidor.buscarAlteracoes('clientes', cursor, 500);

    expect(chamadas[1]).toEqual([
      'or',
      [
        'updated_at.gt."2026-11-10T12:00:00.123456+00:00",and(updated_at.eq."2026-11-10T12:00:00.123456+00:00",id.gt.c9)',
      ],
    ]);
  });

  it('erro do PostgREST vira erro do sync', async () => {
    const { servidor } = servidorCom({
      error: { code: '23514', message: 'violates check constraint' },
      status: 400,
    });
    await expect(servidor.enviar('pedidos', { id: 'p1' })).rejects.toMatchObject({
      tipo: 'PERMANENTE',
    });
  });

  it('requisição que não responde vira SEM_REDE', async () => {
    const from = jest.fn(() => ({
      select: () => ({
        order: () => ({ order: () => ({ limit: () => new Promise(() => {}) }) }),
      }),
    }));
    const servidor = new SupabaseServidorRemoto({ from } as never, 20);
    await expect(servidor.buscarAlteracoes('clientes', null, 10)).rejects.toMatchObject({
      tipo: 'SEM_REDE',
    });
  });
});

describe('SupabaseArmazenamentoRemoto', () => {
  beforeEach(() => fsDeTeste.limpar());

  function storageCom(bucket: Record<string, jest.Mock>) {
    const from = jest.fn(() => bucket);
    return { armazenamento: new SupabaseArmazenamentoRemoto({ storage: { from } } as never, 50), from };
  }

  it('envia os bytes do arquivo local como JPEG, com upsert', async () => {
    fsDeTeste.escrever('file:///docs/fotos/f1.jpg', 'jpeg');
    const upload = jest.fn(async () => ({ data: {}, error: null }));
    const { armazenamento, from } = storageCom({ upload });

    await armazenamento.enviar('fotos/f1.jpg', 'u1/f1.jpg');

    expect(from).toHaveBeenCalledWith('fotos');
    expect(upload).toHaveBeenCalledWith('u1/f1.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: true,
    });
  });

  it('arquivo local sumiu: falha permanente', async () => {
    const { armazenamento } = storageCom({ upload: jest.fn() });
    await expect(armazenamento.enviar('fotos/x.jpg', 'u1/x.jpg')).rejects.toMatchObject({
      tipo: 'PERMANENTE',
    });
  });

  it('baixa por URL assinada direto para fotos/', async () => {
    downloadsDeTeste.conteudo.set('https://assinada/f1', 'jpeg-remoto');
    const createSignedUrl = jest.fn(async () => ({
      data: { signedUrl: 'https://assinada/f1' },
      error: null,
    }));
    const { armazenamento } = storageCom({ createSignedUrl });

    await armazenamento.baixar('u1/f1.jpg', 'fotos/f1.jpg');

    expect(createSignedUrl).toHaveBeenCalledWith('u1/f1.jpg', 60);
    expect(fsDeTeste.existe('file:///docs/fotos/f1.jpg')).toBe(true);
  });

  it('download que falha (rede) vira SEM_REDE', async () => {
    downloadsDeTeste.falha = new Error('Network request failed');
    const createSignedUrl = jest.fn(async () => ({ data: { signedUrl: 'https://x' }, error: null }));
    const { armazenamento } = storageCom({ createSignedUrl });
    await expect(armazenamento.baixar('u1/f1.jpg', 'fotos/f1.jpg')).rejects.toMatchObject({
      tipo: 'SEM_REDE',
    });
  });
});

describe('traduzirErroSupabase', () => {
  it.each([
    [{ status: 0, message: 'TypeError: Network request failed' }, 'SEM_REDE'],
    [{ status: 0, message: 'Failed to fetch' }, 'SEM_REDE'],
    [{ status: 401, code: 'PGRST301', message: 'JWT expired' }, 'SESSAO'],
    [{ status: 409, code: '23503', message: 'violates foreign key constraint' }, 'TRANSITORIO'],
    [{ status: 503, message: 'Service Unavailable' }, 'TRANSITORIO'],
    [{ status: 429, message: 'Too many requests' }, 'TRANSITORIO'],
    [{ status: 400, code: '23514', message: 'violates check constraint' }, 'PERMANENTE'],
    [{ status: 403, code: '42501', message: 'new row violates row-level security policy' }, 'PERMANENTE'],
  ])('%j → %s', (falha, tipo) => {
    expect(traduzirErroSupabase(falha).tipo).toBe(tipo);
  });
});
