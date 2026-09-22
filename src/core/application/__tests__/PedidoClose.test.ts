import { Cliente } from '../../domain/entities/Cliente';
import { Obra } from '../../domain/entities/Obra';
import { Pedido } from '../../domain/entities/Pedido';
import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { InMemoryObraRepository } from '../../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { CancelarPedidoUseCase } from '../usecases/CancelarPedidoUseCase';
import { CadastrarObraUseCase } from '../usecases/CadastrarObraUseCase';
import { ConcluirPedidoUseCase } from '../usecases/ConcluirPedidoUseCase';
import { VendaDiretaUseCase } from '../usecases/VendaDiretaUseCase';
import { VincularObraAoPedidoUseCase } from '../usecases/VincularObraAoPedidoUseCase';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO_ID = 'b2222222-2222-4222-8222-222222222222';

async function setupComObraUnica() {
  const pedidos = new InMemoryPedidoRepository();
  const obras = new InMemoryObraRepository();
  const sync = new FakeSyncGateway();
  const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
  const obra = Obra.criar({ usuarioId: USUARIO_ID, nome: 'Aguia', tipo: 'UNICA' });
  obra.reservar();
  await obras.save(obra);
  const pedido = Pedido.criar({
    usuarioId: USUARIO_ID,
    clienteId: cliente.id,
    descricao: 'Aguia',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-10-05'),
    obraId: obra.id,
  });
  pedido.moverParaFazendo();
  await pedidos.save(pedido);
  return { pedidos, obras, sync, pedido, obra };
}

describe('concluir/cancelar/vincular', () => {
  it('concluir sem foto lanca e mantem FAZENDO (RNF11)', async () => {
    const { pedidos, obras, sync, pedido } = await setupComObraUnica();
    const useCase = new ConcluirPedidoUseCase(pedidos, obras, sync);

    await expect(useCase.execute({ pedidoId: pedido.id, fotoPath: null })).rejects.toThrow(
      /foto/i,
    );

    expect((await pedidos.findById(pedido.id))!.status).toBe('FAZENDO');
  });

  it('concluir com foto move a FEITO e da baixa na UNICA (sequencia 7.1)', async () => {
    const { pedidos, obras, sync, pedido, obra } = await setupComObraUnica();
    const useCase = new ConcluirPedidoUseCase(pedidos, obras, sync);

    const feito = await useCase.execute({ pedidoId: pedido.id, fotoPath: '/tmp/foto.jpg' });

    expect(feito.status).toBe('FEITO');
    expect((await obras.findById(obra.id))!.statusObra).toBe('ENTREGUE');
  });

  it('duplo concluir lanca (Review Focus duplo clique)', async () => {
    const { pedidos, obras, sync, pedido } = await setupComObraUnica();
    const useCase = new ConcluirPedidoUseCase(pedidos, obras, sync);
    await useCase.execute({ pedidoId: pedido.id, fotoPath: '/tmp/a.jpg' });

    await expect(
      useCase.execute({ pedidoId: pedido.id, fotoPath: '/tmp/b.jpg' }),
    ).rejects.toThrow();
  });

  it('cancelar com confirmado=false aborta sem tocar estoque (Review Focus)', async () => {
    const { pedidos, obras, sync, pedido, obra } = await setupComObraUnica();
    const useCase = new CancelarPedidoUseCase(pedidos, obras, sync);

    await useCase.execute({ pedidoId: pedido.id, confirmado: false });

    expect(await pedidos.findById(pedido.id)).not.toBeNull();
    expect((await obras.findById(obra.id))!.statusObra).toBe('RESERVADA');
  });

  it('cancelar confirmado libera UNICA + enfileira DELETAR', async () => {
    const { pedidos, obras, sync, pedido, obra } = await setupComObraUnica();
    const useCase = new CancelarPedidoUseCase(pedidos, obras, sync);

    await useCase.execute({ pedidoId: pedido.id, confirmado: true });

    expect(await pedidos.findById(pedido.id)).toBeNull();
    expect((await obras.findById(obra.id))!.statusObra).toBe('DISPONIVEL');
    expect(
      sync.queue.some((entry) => entry.tipo === 'DELETAR' && entry.entidade === 'Pedido'),
    ).toBe(true);
    expect(
      sync.queue.some(
        (entry) =>
          entry.tipo === 'EDITAR' && entry.entidade === 'Obra' && entry.entidadeId === obra.id,
      ),
    ).toBe(true);
  });

  it('vincular obra UNICA reserva estoque e atualiza pedido', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'pedido',
      canalOrigem: 'PRESENCIAL',
      dataEntrega: new Date('2026-11-01'),
    });
    const obra = Obra.criar({ usuarioId: USUARIO_ID, nome: 'Onca', tipo: 'UNICA' });
    await pedidos.save(pedido);
    await obras.save(obra);
    const useCase = new VincularObraAoPedidoUseCase(pedidos, obras, sync);

    const vinculado = await useCase.execute({ pedidoId: pedido.id, obraId: obra.id });

    expect(vinculado.obraId).toBe(obra.id);
    expect((await obras.findById(obra.id))!.statusObra).toBe('RESERVADA');
    expect(
      sync.queue.some(
        (entry) =>
          entry.tipo === 'EDITAR' && entry.entidade === 'Obra' && entry.entidadeId === obra.id,
      ),
    ).toBe(true);
  });

  it('concluir rejeita obra de outro usuario sem alterar pedido ou estoque', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obra = Obra.criar({ usuarioId: OUTRO_USUARIO_ID, nome: 'Outra', tipo: 'UNICA' });
    obra.reservar();
    await obras.save(obra);
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'pedido',
      canalOrigem: 'PRESENCIAL',
      dataEntrega: new Date('2026-11-01'),
      obraId: obra.id,
    });
    pedido.moverParaFazendo();
    await pedidos.save(pedido);
    const useCase = new ConcluirPedidoUseCase(pedidos, obras, sync);

    await expect(
      useCase.execute({ pedidoId: pedido.id, fotoPath: '/tmp/foto.jpg' }),
    ).rejects.toThrow(/nao encontrad/i);

    expect((await pedidos.findById(pedido.id))!.status).toBe('FAZENDO');
    expect((await obras.findById(obra.id))!.statusObra).toBe('RESERVADA');
    expect(sync.queue).toHaveLength(0);
  });

  it('cancelar rejeita obra de outro usuario sem remover pedido ou compensar estoque', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obra = Obra.criar({ usuarioId: OUTRO_USUARIO_ID, nome: 'Outra', tipo: 'SERIE', quantidade: 2 });
    obra.decrementarUnidades();
    await obras.save(obra);
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'pedido',
      canalOrigem: 'PRESENCIAL',
      dataEntrega: new Date('2026-11-01'),
      obraId: obra.id,
    });
    await pedidos.save(pedido);
    const useCase = new CancelarPedidoUseCase(pedidos, obras, sync);

    await expect(useCase.execute({ pedidoId: pedido.id, confirmado: true })).rejects.toThrow(
      /nao encontrad/i,
    );

    expect(await pedidos.findById(pedido.id)).not.toBeNull();
    expect((await obras.findById(obra.id))!.quantidade).toBe(1);
    expect(sync.queue).toHaveLength(0);
  });

  it('vinculo invalido nao decrementa a nova obra', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const sync = new FakeSyncGateway();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'J', contato: 'x' });
    const obraAtual = Obra.criar({ usuarioId: USUARIO_ID, nome: 'Atual', tipo: 'UNICA' });
    const novaObra = Obra.criar({
      usuarioId: USUARIO_ID,
      nome: 'Nova',
      tipo: 'SERIE',
      quantidade: 3,
    });
    const pedido = Pedido.criar({
      usuarioId: USUARIO_ID,
      clienteId: cliente.id,
      descricao: 'pedido',
      canalOrigem: 'PRESENCIAL',
      dataEntrega: new Date('2026-11-01'),
      obraId: obraAtual.id,
    });
    await pedidos.save(pedido);
    await obras.save(obraAtual);
    await obras.save(novaObra);
    const useCase = new VincularObraAoPedidoUseCase(pedidos, obras, sync);

    await expect(useCase.execute({ pedidoId: pedido.id, obraId: novaObra.id })).rejects.toThrow();

    expect((await obras.findById(novaObra.id))!.quantidade).toBe(3);
    expect(sync.queue).toHaveLength(0);
  });

  it('cancelar venda direta restaura todas as unidades vendidas e enfileira a obra', async () => {
    const pedidos = new InMemoryPedidoRepository();
    const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const obra = await new CadastrarObraUseCase(obras, sync).execute({
      usuarioId: USUARIO_ID,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 10,
    });
    const pedido = await new VendaDiretaUseCase(obras, pedidos, clientes, sync).execute({
      usuarioId: USUARIO_ID,
      obraId: obra.id,
      qtd: 3,
    });
    const inicioFilaCancelamento = sync.queue.length;

    await new CancelarPedidoUseCase(pedidos, obras, sync).execute({
      pedidoId: pedido.id,
      confirmado: true,
    });

    expect((await obras.findById(obra.id))!.quantidade).toBe(10);
    expect(sync.queue.slice(inicioFilaCancelamento)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tipo: 'EDITAR', entidade: 'Obra', entidadeId: obra.id }),
        expect.objectContaining({ tipo: 'DELETAR', entidade: 'Pedido', entidadeId: pedido.id }),
      ]),
    );
  });

  it('cancelar pedido concluido restaura obra UNICA entregue', async () => {
    const { pedidos, obras, sync, pedido, obra } = await setupComObraUnica();
    await new ConcluirPedidoUseCase(pedidos, obras, sync).execute({
      pedidoId: pedido.id,
      fotoPath: '/tmp/foto.jpg',
    });

    await new CancelarPedidoUseCase(pedidos, obras, sync).execute({
      pedidoId: pedido.id,
      confirmado: true,
    });

    expect((await obras.findById(obra.id))!.statusObra).toBe('DISPONIVEL');
  });
});
