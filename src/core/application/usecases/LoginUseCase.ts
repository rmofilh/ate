import type { AuthSession, IAuthGateway } from '../gateways/IAuthGateway';

export class LoginUseCase {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(args: { email: string; password: string }): Promise<AuthSession> {
    const email = args.email.trim().toLowerCase();
    if (!email || !args.password) throw new Error('E-mail e senha sao obrigatorios');
    return this.auth.login(email, args.password);
  }
}
