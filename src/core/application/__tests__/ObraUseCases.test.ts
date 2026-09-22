import { Cliente } from '../../domain/entities/Cliente';
import { Pedido } from '../../domain/entities/Pedido';
import { InMemoryObraRepository } from '../../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { AdicionarUnidadesUseCase } from '../usecases/AdicionarUnidadesUseCase';
import { CadastrarObraUseCase } from '../usecases/CadastrarObraUseCase';
import { ConsultarEstoqueUseCase } from '../usecases/ConsultarEstoqueUseCase';
import { RemoverObraUseCase } from '../usecases/RemoverObraUseCase';
import { RemoverUnidadesUseCase } from '../usecases/RemoverUnidadesUseCase';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO_ID = 'b2222222-2222-4222-8222-222222222222';

describe('Obra use cases', () => {
  it('cadastrar SERIE + adicionar unidades', async () => {
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 2,
    });
    const adicionar = new AdicionarUnidadesUseCase(obras, sync);

    const atual = await adicionar.execute({ obraId: obra.id, qtd: 3 });

    expect(atual.quantidade).toBe(5);
  });

  it('consultar estoque retorna somente obras do usuario', async () => {
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const esperada = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 2,
    });
    await cadastrar.execute({
      usuarioId: OUTRO_USUARIO_ID,
      nome: 'Outra',
      tipo: 'UNICA',
    });
    const consultar = new ConsultarEstoqueUseCase(obras);

    expect(await consultar.execute({ usuarioId: USUARIO_ID })).toEqual([esperada]);
  });

  it('remover obra vinculada a pedido aberto bloqueia (RF22)', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Aguia',
      tipo: 'UNICA',
    });
    obra.reservar();
    await obras.save(obra);
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'p',
      canalOrigem: 'WHATSAPP',
      dataEntrega: new Date('2026-10-01'),
      obraId: obra.id,
    });
    await pedidos.save(pedido);
    const remover = new RemoverObraUseCase(obras, pedidos, sync);

    await expect(remover.execute({ obraId: obra.id, confirmado: true })).rejects.toThrow(
      /vinculada/i,
    );
  });

  it('remover obra desvinculada arquiva, soft-deleta e enfileira', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Aguia',
      tipo: 'UNICA',
    });
    const remover = new RemoverObraUseCase(obras, pedidos, sync);

    await remover.execute({ obraId: obra.id, confirmado: true });

    expect(await obras.findById(obra.id)).toBeNull();
    expect(sync.queue).toContainEqual(
      expect.objectContaining({ tipo: 'DELETAR', entidade: 'Obra', entidadeId: obra.id }),
    );
  });

  it('remover obra vinculada somente a pedido FEITO e permitido', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obra = await new CadastrarObraUseCase(obras, sync).execute({
      usuarioId: USUARIO_ID,
      nome: 'Aguia entregue',
      tipo: 'UNICA',
    });
    obra.reservar();
    obra.darBaixa();
    await obras.save(obra);
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'entregue',
      canalOrigem: 'WHATSAPP',
      dataEntrega: new Date('2026-10-01'),
      obraId: obra.id,
    });
    pedido.moverParaFazendo();
    pedido.concluir('/tmp/foto.jpg');
    await pedidos.save(pedido);

    await new RemoverObraUseCase(obras, pedidos, sync).execute({
      obraId: obra.id,
      confirmado: true,
    });

    expect(await obras.findById(obra.id)).toBeNull();
  });

  it('RF25 exige confirmado + duplaConfirmacao', async () => {
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'C',
      tipo: 'SERIE',
      quantidade: 5,
    });
    const useCase = new RemoverUnidadesUseCase(obras, sync);

    await expect(
      useCase.execute({ obraId: obra.id, qtd: 1, confirmado: false, duplaConfirmacao: true }),
    ).rejects.toThrow(/confirma/i);
    await expect(
      useCase.execute({ obraId: obra.id, qtd: 1, confirmado: true, duplaConfirmacao: false }),
    ).rejects.toThrow(/dupla/i);
    const atual = await useCase.execute({
      obraId: obra.id,
      qtd: 2,
      confirmado: true,
      duplaConfirmacao: true,
    });

    expect(atual.quantidade).toBe(3);
  });
});
