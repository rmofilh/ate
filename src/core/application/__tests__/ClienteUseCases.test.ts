import { Cliente } from '../../domain/entities/Cliente';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { CadastrarClienteUseCase } from '../usecases/CadastrarClienteUseCase';
import { EditarClienteUseCase } from '../usecases/EditarClienteUseCase';
import { ResolverClienteBalcaoUseCase } from '../usecases/ResolverClienteBalcaoUseCase';
import { gerarIdTeste, idsTeste } from '../../../test-support/ids';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const ID_DESCONHECIDO = 'c3333333-3333-4333-8333-333333333333';

it('pede um ID v4 ao gerador e usa o mesmo ID no registro e na fila', async () => {
  const id = gerarIdTeste();
  const ids = { gerar: jest.fn(() => id) };
  const clientes = new InMemoryClienteRepository();
  const sync = new FakeSyncGateway();
  const caso = new CadastrarClienteUseCase(clientes, sync, ids);
  const cliente = await caso.execute({ usuarioId: USUARIO_ID, nome: 'Maria', contato: 'zap' });
  expect(ids.gerar).toHaveBeenCalledTimes(1);
  expect(cliente.id).toBe(id);
  expect(sync.queue[0].entidadeId).toBe(id);
});

it('não salva nem enfileira quando o gerador devolve ID inválido', async () => {
  const clientes = new InMemoryClienteRepository();
  const sync = new FakeSyncGateway();
  const caso = new CadastrarClienteUseCase(clientes, sync, { gerar: () => 'errado' });
  await expect(caso.execute({ usuarioId: USUARIO_ID, nome: 'Maria', contato: 'zap' })).rejects.toThrow(/id.*uuid/i);
  expect(await clientes.findByUsuario(USUARIO_ID)).toEqual([]);
  expect(sync.queue).toEqual([]);
});

describe('Cliente use cases', () => {
  it('cadastrar persiste + enfileira CRIAR', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const useCase = new CadastrarClienteUseCase(repo, sync, idsTeste);

    const cliente = await useCase.execute({
      usuarioId: USUARIO_ID,
      nome: 'Maria',
      contato: 'zap',
    });

    expect(await repo.findByUsuario(USUARIO_ID)).toHaveLength(1);
    expect(sync.queue[0]).toMatchObject({
      tipo: 'CRIAR',
      entidade: 'Cliente',
      entidadeId: cliente.id,
    });
  });

  it('editar cliente inexistente lanca', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const useCase = new EditarClienteUseCase(repo, sync);

    await expect(
      useCase.execute({ clienteId: ID_DESCONHECIDO, nome: 'x', contato: 'y' }),
    ).rejects.toThrow();
  });

  it('resolver Cliente Avulso cria sob demanda e reusa na segunda chamada', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const ids = { gerar: jest.fn(gerarIdTeste) };
    const useCase = new ResolverClienteBalcaoUseCase(repo, sync, ids);

    const primeiro = await useCase.execute({ usuarioId: USUARIO_ID });
    const segundo = await useCase.execute({ usuarioId: USUARIO_ID });

    expect(primeiro.id).toBe(segundo.id);
    expect(primeiro.nome).toBe('Cliente Avulso');
    expect(ids.gerar).toHaveBeenCalledTimes(1);
  });

  it('nao confunde cliente comum homonimo com Cliente Avulso', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const homonimo = Cliente.criar({
      id: gerarIdTeste(),
      usuarioId: USUARIO_ID,
      nome: 'Cliente Avulso',
      contato: 'telefone',
    });
    await repo.save(homonimo);

    const balcao = await new ResolverClienteBalcaoUseCase(repo, sync, idsTeste).execute({
      usuarioId: USUARIO_ID,
    });

    expect(balcao.id).not.toBe(homonimo.id);
    expect(balcao.contato).toBe('');
  });

  it('permite editar cliente comum chamado Cliente Avulso', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const homonimo = Cliente.criar({
      id: gerarIdTeste(),
      usuarioId: USUARIO_ID,
      nome: 'Cliente Avulso',
      contato: 'telefone',
    });
    await repo.save(homonimo);

    const editado = await new EditarClienteUseCase(repo, sync).execute({
      clienteId: homonimo.id,
      nome: 'Cliente da Feira',
      contato: 'telefone',
    });

    expect(editado.nome).toBe('Cliente da Feira');
  });

  it('resolve Cliente Avulso de forma atomica em chamadas concorrentes', async () => {
    const repo = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const useCase = new ResolverClienteBalcaoUseCase(repo, sync, idsTeste);

    const [primeiro, segundo] = await Promise.all([
      useCase.execute({ usuarioId: USUARIO_ID }),
      useCase.execute({ usuarioId: USUARIO_ID }),
    ]);

    expect(primeiro.id).toBe(segundo.id);
    expect(await repo.findByUsuario(USUARIO_ID)).toHaveLength(1);
  });
});
