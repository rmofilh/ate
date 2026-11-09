import { LoginUseCase } from '../../../core/application/usecases/LoginUseCase';
import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import {
  DadosDeOutroUsuarioError,
  protegerDonoDosDados,
  protegerSessaoRestaurada,
} from '../protegerDonoDosDados';

const A = 'a1111111-1111-4111-8111-111111111111';
const B = 'b2222222-2222-4222-8222-222222222222';

function setup(donoAtual: string | null) {
  const auth = new FakeAuthGateway(
    new Map([
      ['a@ate.app', { password: '1', userId: A }],
      ['b@ate.app', { password: '2', userId: B }],
    ]),
  );
  const dono = { ler: jest.fn(async () => donoAtual), registrar: jest.fn(async () => {}) };
  const login = protegerDonoDosDados(new LoginUseCase(auth), auth, dono);
  return { auth, dono, login };
}

describe('protegerDonoDosDados (D4 no login)', () => {
  it('aparelho sem dados: entra e registra o dono', async () => {
    const { login, dono } = setup(null);
    await expect(login.execute({ email: 'a@ate.app', password: '1' })).resolves.toMatchObject({
      userId: A,
    });
    expect(dono.registrar).toHaveBeenCalledWith(A);
  });

  it('mesmo dono: entra sem registrar de novo', async () => {
    const { login, dono } = setup(A);
    await expect(login.execute({ email: 'a@ate.app', password: '1' })).resolves.toMatchObject({
      userId: A,
    });
    expect(dono.registrar).not.toHaveBeenCalled();
  });

  it('outra conta com dados locais: bloqueia, desfaz o login e não apaga nada', async () => {
    const { login, auth, dono } = setup(A);

    await expect(login.execute({ email: 'b@ate.app', password: '2' })).rejects.toBeInstanceOf(
      DadosDeOutroUsuarioError,
    );
    await expect(auth.getSession()).resolves.toBeNull();
    expect(dono.registrar).not.toHaveBeenCalled();
  });

  it('a mensagem explica a saída', () => {
    expect(new DadosDeOutroUsuarioError().message).toMatch(/apagar os dados locais/i);
  });

  it('credencial errada continua sendo o erro do gateway', async () => {
    const { login, dono } = setup(A);
    await expect(login.execute({ email: 'b@ate.app', password: 'x' })).rejects.toThrow(
      'E-mail ou senha incorretos',
    );
    expect(dono.ler).not.toHaveBeenCalled();
  });

  it('continua instanceof LoginUseCase', () => {
    expect(setup(null).login).toBeInstanceOf(LoginUseCase);
  });
});

describe('protegerSessaoRestaurada (D4 no boot)', () => {
  async function comSessaoDe(email: string, senha: string, donoAtual: string | null) {
    const { auth, dono } = setup(donoAtual);
    await auth.login(email, senha);
    return { auth, dono, protegido: protegerSessaoRestaurada(auth, dono) };
  }

  it('sessão do mesmo dono é restaurada', async () => {
    const { protegido } = await comSessaoDe('a@ate.app', '1', A);
    await expect(protegido.getSession()).resolves.toMatchObject({ userId: A });
  });

  it('sessão de outra conta sobre dados alheios é encerrada', async () => {
    const { auth, protegido } = await comSessaoDe('b@ate.app', '2', A);
    await expect(protegido.getSession()).resolves.toBeNull();
    await expect(auth.getSession()).resolves.toBeNull();
  });

  it('aparelho sem dados: restaura e registra o dono', async () => {
    const { dono, protegido } = await comSessaoDe('b@ate.app', '2', null);
    await expect(protegido.getSession()).resolves.toMatchObject({ userId: B });
    expect(dono.registrar).toHaveBeenCalledWith(B);
  });

  it('sem sessão não consulta o dono', async () => {
    const { auth, dono } = setup(A);
    await expect(protegerSessaoRestaurada(auth, dono).getSession()).resolves.toBeNull();
    expect(dono.ler).not.toHaveBeenCalled();
  });
});
