import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { InMemoryObraRepository } from '../../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';
import { CadastrarObraUseCase } from '../usecases/CadastrarObraUseCase';
import { VendaDiretaUseCase } from '../usecases/VendaDiretaUseCase';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO_ID = 'b2222222-2222-4222-8222-222222222222';

describe('VendaDireta (RF26)', () => {
  it('caso 3 valido: cria FEITO com Cliente Avulso e da baixa', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Coruja',
      tipo: 'SERIE',
      quantidade: 4,
    });
    const useCase = new VendaDiretaUseCase(obras, pedidos, clientes, sync);

    const pedido = await useCase.execute({ usuarioId: USUARIO_ID, obraId: obra.id, qtd: 2 });

    expect(pedido.status).toBe('FEITO');
    expect(pedido.vendaDireta).toBe(true);
    expect((await obras.findById(obra.id))!.quantidade).toBe(2);
    expect(
      sync.queue.some((entry) => entry.entidade === 'Pedido' && entry.tipo === 'CRIAR'),
    ).toBe(true);
  });

  it('caso 4 invalido: tipo, usuario, qtd e estoque lancam sem criar', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const unica = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'Aguia',
      tipo: 'UNICA',
    });
    const serie = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'C',
      tipo: 'SERIE',
      quantidade: 1,
    });
    const serieOutroUsuario = await cadastrar.execute({
      usuarioId: OUTRO_USUARIO_ID,
      nome: 'Outra',
      tipo: 'SERIE',
      quantidade: 2,
    });
    const useCase = new VendaDiretaUseCase(obras, pedidos, clientes, sync);

    await expect(
      useCase.execute({ usuarioId: USUARIO_ID, obraId: unica.id, qtd: 1 }),
    ).rejects.toThrow();
    await expect(
      useCase.execute({ usuarioId: USUARIO_ID, obraId: serieOutroUsuario.id, qtd: 1 }),
    ).rejects.toThrow(/nao encontrad/i);
    await expect(
      useCase.execute({ usuarioId: USUARIO_ID, obraId: serie.id, qtd: 0 }),
    ).rejects.toThrow();
    await expect(
      useCase.execute({
        usuarioId: USUARIO_ID,
        obraId: serie.id,
        qtd: '2' as unknown as number,
      }),
    ).rejects.toThrow(/quantidade/i);
    await expect(
      useCase.execute({ usuarioId: USUARIO_ID, obraId: serie.id, qtd: 5 }),
    ).rejects.toThrow();
    expect(await pedidos.findByUsuario(USUARIO_ID)).toHaveLength(0);
  });

  it('caso 5 orquestracao: Cliente Avulso unico reutilizado', async () => {
    const obras = new InMemoryObraRepository();
    const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository();
    const sync = new FakeSyncGateway();
    const cadastrar = new CadastrarObraUseCase(obras, sync);
    const obra = await cadastrar.execute({
      usuarioId: USUARIO_ID,
      nome: 'C',
      tipo: 'SERIE',
      quantidade: 10,
    });
    const useCase = new VendaDiretaUseCase(obras, pedidos, clientes, sync);

    const primeiro = await useCase.execute({
      usuarioId: USUARIO_ID,
      obraId: obra.id,
      qtd: 1,
    });
    const segundo = await useCase.execute({
      usuarioId: USUARIO_ID,
      obraId: obra.id,
      qtd: 1,
    });

    expect(primeiro.clienteId).toBe(segundo.clienteId);
  });
});
