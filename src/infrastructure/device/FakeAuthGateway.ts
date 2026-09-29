import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';

export class FakeAuthGateway implements IAuthGateway {
  private session: AuthSession | null = null;

  constructor(
    private readonly users = new Map<string, { password: string; userId: string }>([
      [
        'artesao@email.com',
        { password: '123456', userId: 'a1111111-1111-4111-8111-111111111111' },
      ],
    ]),
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const user = this.users.get(email.trim().toLowerCase());
    if (!user || user.password !== password) throw new Error('E-mail ou senha incorretos');

    this.session = { userId: user.userId, token: `fake-token-${user.userId}` };
    return this.session;
  }

  async logout(): Promise<void> {
    this.session = null;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }
}
