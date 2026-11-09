import { AuthApiError, AuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import {
  type ClienteDeAuth,
  MENSAGEM_CREDENCIAIS_INVALIDAS,
  MENSAGEM_EMAIL_NAO_CONFIRMADO,
  MENSAGEM_FALHA_LOGIN,
  MENSAGEM_SEM_CONEXAO,
  SupabaseAuthGateway,
} from '../SupabaseAuthGateway';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const CHAVE = 'ate-auth';
const SESSAO = {
  access_token: 'token-1',
  refresh_token: 'refresh-1',
  expires_at: 1,
  user: { id: USUARIO },
} as unknown as Session;

const nuncaResolve = () => new Promise<never>(() => {});

function setup() {
  const auth = {
    signInWithPassword: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(async () => ({ error: null })),
  };
  const guardado = new Map<string, string>();
  const armazenamento = {
    getItem: jest.fn(async (chave: string) => guardado.get(chave) ?? null),
    setItem: jest.fn(async (chave: string, valor: string) => {
      guardado.set(chave, valor);
    }),
    removeItem: jest.fn(async (chave: string) => {
      guardado.delete(chave);
    }),
  };
  const gateway = new SupabaseAuthGateway(auth as unknown as ClienteDeAuth, armazenamento, CHAVE, {
    login: 20,
    sessao: 20,
    logout: 20,
  });
  return { auth, armazenamento, guardado, gateway };
}

const semRede = () => new AuthRetryableFetchError('Failed to fetch', 0);

describe('SupabaseAuthGateway.login', () => {
  it('devolve userId e token da sessão', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { session: SESSAO }, error: null });

    await expect(gateway.login('artesao@email.com', 'senha')).resolves.toEqual({
      userId: USUARIO,
      token: 'token-1',
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'artesao@email.com',
      password: 'senha',
    });
  });

  it('credencial errada vira mensagem do app', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_CREDENCIAIS_INVALIDAS);
  });

  it('e-mail não confirmado tem mensagem própria (não é "senha errada")', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
    });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_EMAIL_NAO_CONFIRMADO);
  });

  it('sem rede explica que precisa entrar uma vez com internet', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_SEM_CONEXAO);
  });

  it('exceção de rede lançada também vira "sem conexão"', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockRejectedValue(new TypeError('Network request failed'));
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_SEM_CONEXAO);
  });

  it('rede lenta demais vira "sem conexão" em vez de travar', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockImplementation(nuncaResolve);
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_SEM_CONEXAO);
  });

  it('outro erro do servidor vira mensagem genérica', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Internal error', 500, 'unexpected_failure'),
    });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_FALHA_LOGIN);
  });
});

describe('SupabaseAuthGateway.getSession', () => {
  it('sessão válida restaurada', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: SESSAO }, error: null });
    await expect(gateway.getSession()).resolves.toEqual({ userId: USUARIO, token: 'token-1' });
  });

  it('sem sessão devolve null', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('offline com token vencido: usa a sessão guardada e não desloga', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });

    await expect(gateway.getSession()).resolves.toEqual({ userId: USUARIO, token: 'token-1' });
  });

  it('rede lenta demais no boot: usa a sessão guardada em vez de travar', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.getSession.mockImplementation(nuncaResolve);

    await expect(gateway.getSession()).resolves.toEqual({ userId: USUARIO, token: 'token-1' });
  });

  it('offline sem nada guardado devolve null', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('offline com sessão guardada ilegível devolve null', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, '{"sem":"usuario"}');
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('erro definitivo (refresh revogado) devolve null e apaga a sessão guardada', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found'),
    });

    await expect(gateway.getSession()).resolves.toBeNull();
    expect(guardado.has(CHAVE)).toBe(false);

    // Um boot offline depois disso não ressuscita a sessão revogada.
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.getSession()).resolves.toBeNull();
  });
});

describe('SupabaseAuthGateway.logout', () => {
  it('encerra só a sessão deste aparelho e apaga a guardada', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));

    await gateway.logout();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(guardado.has(CHAVE)).toBe(false);
  });

  it('offline: o signOut falha, mas a sessão local some e nada é lançado', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.signOut.mockResolvedValue({ error: semRede() } as never);

    await expect(gateway.logout()).resolves.toBeUndefined();
    expect(guardado.has(CHAVE)).toBe(false);
  });

  it('signOut que lança também não impede apagar a sessão', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.signOut.mockRejectedValue(new TypeError('Network request failed'));

    await expect(gateway.logout()).resolves.toBeUndefined();
    expect(guardado.has(CHAVE)).toBe(false);
  });

  it('signOut que trava (rede lenta) não prende o botão Sair', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.signOut.mockImplementation(nuncaResolve);

    await expect(gateway.logout()).resolves.toBeUndefined();
    expect(guardado.has(CHAVE)).toBe(false);
  });
});
