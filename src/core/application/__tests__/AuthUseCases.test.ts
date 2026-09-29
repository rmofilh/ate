import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import { LoginUseCase } from '../usecases/LoginUseCase';
import { LogoutUseCase } from '../usecases/LogoutUseCase';

describe('Auth use cases', () => {
  it('login valido retorna sessao (UC01 fluxo principal)', async () => {
    const gateway = new FakeAuthGateway();
    const useCase = new LoginUseCase(gateway);

    const sessao = await useCase.execute({ email: 'artesao@email.com', password: '123456' });

    expect(sessao.userId).toBeTruthy();
    expect(await gateway.getSession()).not.toBeNull();
  });

  it('normaliza e-mail com espacos/caixa (Review Focus)', async () => {
    const gateway = new FakeAuthGateway();
    const useCase = new LoginUseCase(gateway);

    const sessao = await useCase.execute({
      email: '  ARTESAO@Email.com  ',
      password: '123456',
    });

    expect(sessao.userId).toBeTruthy();
  });

  it('credencial invalida lanca mensagem UC01 FA1', async () => {
    const gateway = new FakeAuthGateway();
    const useCase = new LoginUseCase(gateway);

    await expect(
      useCase.execute({ email: 'artesao@email.com', password: 'errada' }),
    ).rejects.toThrow(/incorretos/i);
  });

  it('logout limpa sessao (UC02)', async () => {
    const gateway = new FakeAuthGateway();
    await new LoginUseCase(gateway).execute({
      email: 'artesao@email.com',
      password: '123456',
    });

    await new LogoutUseCase(gateway).execute();

    expect(await gateway.getSession()).toBeNull();
  });
});
