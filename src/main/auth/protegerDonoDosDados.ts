import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { LoginUseCase } from '../../core/application/usecases/LoginUseCase';

export class DadosDeOutroUsuarioError extends Error {
  constructor() {
    super(
      'Este aparelho tem dados de outra conta. Para entrar com esta conta, é preciso apagar os dados locais.',
    );
    this.name = 'DadosDeOutroUsuarioError';
    Object.setPrototypeOf(this, DadosDeOutroUsuarioError.prototype);
  }
}

export interface DonoDosDados {
  ler(): Promise<string | null>;
  registrar(usuarioId: string): Promise<void>;
}

/**
 * D4 no login: depois de autenticar, confere se os dados locais são da mesma conta. Se forem de
 * outra, desfaz o login (logout local) e lança DadosDeOutroUsuarioError; nada é apagado aqui.
 * Mesmo tipo e protótipo do LoginUseCase original.
 */
export function protegerDonoDosDados(
  login: LoginUseCase,
  auth: IAuthGateway,
  dono: DonoDosDados,
): LoginUseCase {
  const original = login.execute.bind(login);
  const decorado = Object.create(Object.getPrototypeOf(login)) as LoginUseCase;
  Object.assign(decorado, login);
  decorado.execute = async (args: { email: string; password: string }): Promise<AuthSession> => {
    const sessao = await original(args);
    const atual = await dono.ler();
    if (atual && atual !== sessao.userId) {
      await auth.logout();
      throw new DadosDeOutroUsuarioError();
    }
    if (!atual) await dono.registrar(sessao.userId);
    return sessao;
  };
  return decorado;
}

/**
 * D4 no boot: uma sessão restaurada de outra conta (ex.: dados apagados e recriados por outra
 * via) não pode abrir o app sobre dados alheios. Encerra a sessão e o app volta ao login.
 */
export function protegerSessaoRestaurada(auth: IAuthGateway, dono: DonoDosDados): IAuthGateway {
  return {
    login: (email, senha) => auth.login(email, senha),
    logout: () => auth.logout(),
    async getSession() {
      const sessao = await auth.getSession();
      if (!sessao) return null;
      const atual = await dono.ler();
      if (atual && atual !== sessao.userId) {
        await auth.logout();
        return null;
      }
      if (!atual) await dono.registrar(sessao.userId);
      return sessao;
    },
  };
}
