import { AdicionarUnidadesUseCase } from '../../core/application/usecases/AdicionarUnidadesUseCase';
import { CadastrarClienteUseCase } from '../../core/application/usecases/CadastrarClienteUseCase';
import { CadastrarEventoUseCase } from '../../core/application/usecases/CadastrarEventoUseCase';
import { CadastrarObraUseCase } from '../../core/application/usecases/CadastrarObraUseCase';
import { CadastrarPedidoUseCase } from '../../core/application/usecases/CadastrarPedidoUseCase';
import { CancelarPedidoUseCase } from '../../core/application/usecases/CancelarPedidoUseCase';
import { ConcluirPedidoUseCase } from '../../core/application/usecases/ConcluirPedidoUseCase';
import { ConsultarEstoqueUseCase } from '../../core/application/usecases/ConsultarEstoqueUseCase';
import { ConsultarPedidosUseCase } from '../../core/application/usecases/ConsultarPedidosUseCase';
import { EditarClienteUseCase } from '../../core/application/usecases/EditarClienteUseCase';
import { EditarEventoUseCase } from '../../core/application/usecases/EditarEventoUseCase';
import { EditarPedidoUseCase } from '../../core/application/usecases/EditarPedidoUseCase';
import { IniciarProducaoUseCase } from '../../core/application/usecases/IniciarProducaoUseCase';
import { ListarEventosUseCase } from '../../core/application/usecases/ListarEventosUseCase';
import { LoginUseCase } from '../../core/application/usecases/LoginUseCase';
import { LogoutUseCase } from '../../core/application/usecases/LogoutUseCase';
import { RemoverEventoUseCase } from '../../core/application/usecases/RemoverEventoUseCase';
import { RemoverObraUseCase } from '../../core/application/usecases/RemoverObraUseCase';
import { RemoverUnidadesUseCase } from '../../core/application/usecases/RemoverUnidadesUseCase';
import { VendaDiretaUseCase } from '../../core/application/usecases/VendaDiretaUseCase';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';
import { InMemoryEventoRepository } from '../../infrastructure/database/memory/InMemoryEventoRepository';
import { InMemoryObraRepository } from '../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeAuthGateway } from '../../infrastructure/device/FakeAuthGateway';
import { FakeCameraGateway } from '../../infrastructure/device/FakeCameraGateway';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

export function makeFakeProviders() {
  const seed = seedFixtures();
  const clientes = new InMemoryClienteRepository();
  const pedidos = new InMemoryPedidoRepository();
  const obras = new InMemoryObraRepository();
  const eventos = new InMemoryEventoRepository();
  const auth = new FakeAuthGateway();
  const camera = new FakeCameraGateway();
  const location = new FakeLocationGateway();
  const sync = new FakeSyncGateway();

  for (const cliente of seed.clientes) void clientes.save(cliente);
  for (const pedido of seed.pedidos) void pedidos.save(pedido);
  for (const obra of seed.obras) void obras.save(obra);
  for (const evento of seed.eventos) void eventos.save(evento);

  const useCases = {
    login: new LoginUseCase(auth),
    logout: new LogoutUseCase(auth),
    consultarPedidos: new ConsultarPedidosUseCase(pedidos),
    iniciarProducao: new IniciarProducaoUseCase(pedidos, sync),
    concluirPedido: new ConcluirPedidoUseCase(pedidos, obras, sync),
    cancelarPedido: new CancelarPedidoUseCase(pedidos, obras, sync),
    cadastrarPedido: new CadastrarPedidoUseCase(pedidos, obras, clientes, sync),
    editarPedido: new EditarPedidoUseCase(pedidos, sync),
    cadastrarCliente: new CadastrarClienteUseCase(clientes, sync),
    editarCliente: new EditarClienteUseCase(clientes, sync),
    consultarEstoque: new ConsultarEstoqueUseCase(obras),
    cadastrarObra: new CadastrarObraUseCase(obras, sync),
    adicionarUnidades: new AdicionarUnidadesUseCase(obras, sync),
    removerUnidades: new RemoverUnidadesUseCase(obras, sync),
    removerObra: new RemoverObraUseCase(obras, pedidos, sync),
    vendaDireta: new VendaDiretaUseCase(obras, pedidos, clientes, sync),
    listarEventos: new ListarEventosUseCase(eventos),
    cadastrarEvento: new CadastrarEventoUseCase(eventos, sync, location),
    editarEvento: new EditarEventoUseCase(eventos, sync),
    removerEvento: new RemoverEventoUseCase(eventos, sync),
  };

  return {
    ...seed,
    gateways: { auth, camera, location, sync },
    repositories: { clientes, pedidos, obras, eventos },
    useCases,
    async loadData() {
      const [pedidosCarregados, obrasCarregadas, eventosCarregados, clientesCarregados] =
        await Promise.all([
          useCases.consultarPedidos.execute({ usuarioId: seed.usuarioId }),
          useCases.consultarEstoque.execute({ usuarioId: seed.usuarioId }),
          useCases.listarEventos.execute({ usuarioId: seed.usuarioId }),
          clientes.findByUsuario(seed.usuarioId),
        ]);

      return {
        pedidos: pedidosCarregados,
        obras: obrasCarregadas,
        eventos: eventosCarregados,
        clientes: clientesCarregados,
      };
    },
  };
}

export type FakeProviderBag = ReturnType<typeof makeFakeProviders>;

export const FakeProviders = {
  harness: seedFixtures,
};
