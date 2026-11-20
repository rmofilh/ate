import { type AuthError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import { comLimiteDeTempo } from '../shared/limiteDeTempo';
import type { ArmazenamentoDeSessao } from './ArmazenamentoCifradoDeSessao';

export const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos';
export const MENSAGEM_EMAIL_NAO_CONFIRMADO =
  'E-mail ainda não confirmado. Confirme a conta no painel do Supabase.';
export const MENSAGEM_SEM_CONEXAO =
  'Sem conexão: entre uma vez com internet para usar o app offline.';
export const MENSAGEM_FALHA_LOGIN = 'Não foi possível entrar agora. Tente novamente.';

/** Rede ruim não pode prender o login, o boot nem o botão Sair. */
export const LIMITE_LOGIN_MS = 15_000;
export const LIMITE_SESSAO_MS = 5_000;
export const LIMITE_LOGOUT_MS = 3_000;

class TempoEsgotadoError extends Error {
  constructor() {
    super('Tempo esgotado');
    this.name = 'TempoEsgotadoError';
  }
}

type Resposta<T> = Promise<{ data: T; error: AuthError | null }>;

/** O pedaço do cliente de auth do supabase-js que o gateway usa. */
export interface ClienteDeAuth {
  signInWithPassword(credenciais: {
    email: string;
    password: string;
  }): Resposta<{ session: Session | null }>;
  getSession(): Resposta<{ session: Session | null }>;
  signOut(opcoes: { scope: 'local' }): Promise<{ error: AuthError | null }>;
  onAuthStateChange?(
    ouvinte: (evento: string, sessao: Session | null) => void,
  ): { data: { subscription: { unsubscribe(): void } } };
}

/** Quem consegue avisar que o servidor encerrou a sessão com o app aberto. */
export interface ObservadorDeSessao {
  aoEncerrarSessao(ouvinte: () => void): () => void;
}

export interface LimitesDeTempo {
  login: number;
  sessao: number;
  logout: number;
}

/** IAuthGateway real. A conta é criada no dashboard; o app só entra e sai. */
export class SupabaseAuthGateway implements IAuthGateway, ObservadorDeSessao {
  constructor(
    private readonly auth: ClienteDeAuth,
    private readonly armazenamento: ArmazenamentoDeSessao,
    private readonly chaveSessao: string,
    private readonly limites: LimitesDeTempo = {
      login: LIMITE_LOGIN_MS,
      sessao: LIMITE_SESSAO_MS,
      logout: LIMITE_LOGOUT_MS,
    },
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    let resposta: Awaited<ReturnType<ClienteDeAuth['signInWithPassword']>>;
    try {
      resposta = await comLimiteDeTempo(
        this.auth.signInWithPassword({ email, password }),
        this.limites.login,
        () => new TempoEsgotadoError(),
      );
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    if (resposta.error) throw new Error(traduzirErro(resposta.error));
    if (!resposta.data.session) throw new Error(MENSAGEM_FALHA_LOGIN);
    return paraSessao(resposta.data.session);
  }

  /**
   * Restaura a sessão sem exigir rede. Sem internet (ou rede lenta demais) e com o token vencido,
   * vale a sessão guardada: o artesão abre o app na feira. Erro definitivo do servidor (refresh
   * revogado) apaga a sessão guardada, para um boot offline posterior não a ressuscitar.
   */
  async getSession(): Promise<AuthSession | null> {
    let resposta: Awaited<ReturnType<ClienteDeAuth['getSession']>>;
    try {
      resposta = await comLimiteDeTempo(
        this.auth.getSession(),
        this.limites.sessao,
        () => new TempoEsgotadoError(),
      );
    } catch {
      return this.sessaoGuardada();
    }
    const { data, error } = resposta;
    if (data.session) return paraSessao(data.session);
    if (!error) return null;
    if (isAuthRetryableFetchError(error)) return this.sessaoGuardada();
    await this.armazenamento.removeItem(this.chaveSessao);
    return null;
  }

  /** Funciona offline: mesmo se o signOut falhar ou demorar, a sessão deste aparelho é apagada. */
  async logout(): Promise<void> {
    try {
      await comLimiteDeTempo(
        this.auth.signOut({ scope: 'local' }),
        this.limites.logout,
        () => new TempoEsgotadoError(),
      );
    } catch {
      // Sem rede ou rede lenta: segue para apagar a sessão local.
    } finally {
      await this.armazenamento.removeItem(this.chaveSessao);
    }
  }

  /**
   * onAuthStateChange (aula 3): SIGNED_OUT chega quando o Supabase encerra a sessão, por exemplo
   * com o refresh token revogado. Falha de rede ao renovar não gera SIGNED_OUT (offline segue logado).
   */
  aoEncerrarSessao(ouvinte: () => void): () => void {
    const assinatura = this.auth.onAuthStateChange?.((evento) => {
      if (evento === 'SIGNED_OUT') ouvinte();
    });
    return () => assinatura?.data.subscription.unsubscribe();
  }

  private async sessaoGuardada(): Promise<AuthSession | null> {
    const bruto = await this.armazenamento.getItem(this.chaveSessao);
    if (!bruto) return null;
    try {
      const salva = JSON.parse(bruto) as { access_token?: unknown; user?: { id?: unknown } };
      if (typeof salva.access_token === 'string' && typeof salva.user?.id === 'string') {
        return { userId: salva.user.id, token: salva.access_token };
      }
    } catch {
      // Sessão ilegível conta como "sem sessão".
    }
    return null;
  }
}

/** Decide pelo código do erro do Supabase Auth, não só pelo status HTTP. */
function traduzirErro(erro: AuthError): string {
  if (isAuthRetryableFetchError(erro)) return MENSAGEM_SEM_CONEXAO;
  if (erro.code === 'invalid_credentials') return MENSAGEM_CREDENCIAIS_INVALIDAS;
  if (erro.code === 'email_not_confirmed') return MENSAGEM_EMAIL_NAO_CONFIRMADO;
  return MENSAGEM_FALHA_LOGIN;
}

function paraSessao(sessao: Session): AuthSession {
  return { userId: sessao.user.id, token: sessao.access_token };
}
