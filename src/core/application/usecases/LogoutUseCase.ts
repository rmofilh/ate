import type { IAuthGateway } from '../gateways/IAuthGateway';

export class LogoutUseCase {
  constructor(private readonly auth: IAuthGateway) {}

  async execute(): Promise<void> {
    await this.auth.logout();
  }
}
