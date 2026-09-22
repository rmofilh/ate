import { Cliente } from '../../domain/entities/Cliente';
import { Obra } from '../../domain/entities/Obra';
import { Pedido } from '../../domain/entities/Pedido';
import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { InMemoryObraRepository } from '../../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { CadastrarPedidoUseCase } from '../usecases/CadastrarPedidoUseCase';
import { ConsultarPedidosUseCase } from '../usecases/ConsultarPedidosUseCase';
import { EditarPedidoUseCase } from '../usecases/EditarPedidoUseCase';
import { IniciarProducaoUseCase } from '../usecases/IniciarProducaoUseCase';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO_ID = 'b2222222-2222-4222-8222-222222222222';

describe('Pedido write', () => {
  it('cadastrar sem obra cria A_FAZER + enfileira', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    await clientes.save(cliente);
    const useCase = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);

    const pedido = await useCase.execute({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'Onca',
      canalOrigem: 'INSTAGRAM',
      dataEntrega: new Date('2026-11-01'),
    });

    expect(pedido.status).toBe('A_FAZER');
    expect(sync.queue[0].entidade).toBe('Pedido');
  });

  it('cadastrar com SERIE decrementa estoque (sequencia 7.2)', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obra = Obra.criar({
      usuarioId: USUARIO_ID,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 4,
    });
    await clientes.save(cliente);
    await obras.save(obra);
    const useCase = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);

    await useCase.execute({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'p',
      canalOrigem: 'PRESENCIAL',
      dataEntrega: new Date('2026-11-01'),
      obraId: obra.id,
    });

    expect((await obras.findById(obra.id))!.quantidade).toBe(3);
  });

  it('rejeita obra de outro usuario (Review Focus isolamento)', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obraOutro = Obra.criar({
      usuarioId: OUTRO_USUARIO_ID,
      nome: 'X',
      tipo: 'SERIE',
      quantidade: 5,
    });
    await clientes.save(cliente);
    await obras.save(obraOutro);
    const useCase = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);

    await expect(
      useCase.execute({
        usuarioId: USUARIO_ID,
        clienteId: cliente.id,
        descricao: 'p',
        canalOrigem: 'PRESENCIAL',
        dataEntrega: new Date(),
        obraId: obraOutro.id,
      }),
    ).rejects.toThrow(/nao encontrad/i);
  });

  it('iniciar producao move A_FAZER para FAZENDO', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    await clientes.save(cliente);
    const cadastrar = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);
    const pedido = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'p',
      canalOrigem: 'WHATSAPP',
      dataEntrega: new Date('2026-11-01'),
    });
    const iniciar = new IniciarProducaoUseCase(pedidos, sync);

    const movido = await iniciar.execute({ pedidoId: pedido.id });

    expect(movido.status).toBe('FAZENDO');
  });

  it('editar atualiza pedido A_FAZER e enfileira EDITAR', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'antes',
      canalOrigem: 'TELEFONE',
      dataEntrega: new Date('2026-11-01'),
    });
    await pedidos.save(pedido);
    const useCase = new EditarPedidoUseCase(pedidos, sync);

    const editado = await useCase.execute({
      pedidoId: pedido.id,
      descricao: 'depois',
      dataEntrega: new Date('2026-11-02'),
    });

    expect(editado.descricao).toBe('depois');
    expect(sync.queue[0]).toMatchObject({ tipo: 'EDITAR', entidade: 'Pedido' });
  });

  it('consultar filtra por usuario e status', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const aFazer = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'a fazer',
      canalOrigem: 'OUTROS',
      dataEntrega: new Date('2026-11-01'),
    });
    const fazendo = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'fazendo',
      canalOrigem: 'OUTROS',
      dataEntrega: new Date('2026-11-02'),
    });
    fazendo.moverParaFazendo();
    await pedidos.save(aFazer);
    await pedidos.save(fazendo);
    const useCase = new ConsultarPedidosUseCase(pedidos);

    expect(await useCase.execute({ usuarioId: USUARIO_ID })).toHaveLength(2);
    expect(await useCase.execute({ usuarioId: USUARIO_ID, status: 'FAZENDO' })).toEqual([
      fazendo,
    ]);
  });
});
