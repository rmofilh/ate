import type { AuthSession } from '../../core/application/gateways/IAuthGateway';
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
import type { DrizzleAppDb } from '../../infrastructure/database/sqlite/DrizzleDb';
import {
  type ExecutorDeTransacao,
  transacional,
} from '../../infrastructure/database/sqlite/ExecutorDeTransacao';
import { SQLiteClienteRepository } from '../../infrastructure/database/sqlite/SQLiteClienteRepository';
import { SQLiteEventoRepository } from '../../infrastructure/database/sqlite/SQLiteEventoRepository';
import { SQLiteObraRepository } from '../../infrastructure/database/sqlite/SQLiteObraRepository';
import { SQLitePedidoRepository } from '../../infrastructure/database/sqlite/SQLitePedidoRepository';
import { FakeAuthGateway } from '../../infrastructure/device/FakeAuthGateway';
import { FakeCameraGateway } from '../../infrastructure/device/FakeCameraGateway';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { UuidIdGenerator } from '../../infrastructure/device/UuidIdGenerator';
import { OutboxSyncGateway } from '../../infrastructure/sync/OutboxSyncGateway';
import type { CasosDeUso, DadosCarregados, ProviderBag } from './ProviderBag';
import { SessaoNaoDisponivelError } from './SessaoNaoDisponivelError';

/**
 * Composition root do runtime: SQLite + fila outbox. Casos de uso que escrevem rodam em
 * transação (registro e fila juntos). Auth (Plano 3), câmera (Plano 2) e GPS (Plano 5)
 * ainda são fakes.
 */
export function makeSqliteProviders(db: DrizzleAppDb, executor: ExecutorDeTransacao) {
  const ids = new UuidIdGenerator();
  const clientes = new SQLiteClienteRepository(db);
  const pedidos = new SQLitePedidoRepository(db);
  const obras = new SQLiteObraRepository(db);
  const eventos = new SQLiteEventoRepository(db);
  const auth = new FakeAuthGateway();
  const camera = new FakeCameraGateway();
  const location = new FakeLocationGateway();
  const sync = new OutboxSyncGateway(db, ids);
  const tx = <U extends { execute(...args: never[]): Promise<unknown> }>(casoDeUso: U) =>
    transacional(casoDeUso, executor);

  const useCases: CasosDeUso = {
    login: new LoginUseCase(auth),
    logout: new LogoutUseCase(auth),
    consultarPedidos: new ConsultarPedidosUseCase(pedidos),
    iniciarProducao: tx(new IniciarProducaoUseCase(pedidos, sync)),
    concluirPedido: tx(new ConcluirPedidoUseCase(pedidos, obras, sync)),
    cancelarPedido: tx(new CancelarPedidoUseCase(pedidos, obras, sync)),
    cadastrarPedido: tx(new CadastrarPedidoUseCase(pedidos, obras, clientes, sync, ids)),
    editarPedido: tx(new EditarPedidoUseCase(pedidos, sync)),
    cadastrarCliente: tx(new CadastrarClienteUseCase(clientes, sync, ids)),
    editarCliente: tx(new EditarClienteUseCase(clientes, sync)),
    consultarEstoque: new ConsultarEstoqueUseCase(obras),
    cadastrarObra: tx(new CadastrarObraUseCase(obras, sync, ids)),
    adicionarUnidades: tx(new AdicionarUnidadesUseCase(obras, sync)),
    removerUnidades: tx(new RemoverUnidadesUseCase(obras, sync)),
    removerObra: tx(new RemoverObraUseCase(obras, pedidos, sync)),
    vendaDireta: tx(new VendaDiretaUseCase(obras, pedidos, clientes, sync, ids)),
    listarEventos: new ListarEventosUseCase(eventos),
    cadastrarEvento: tx(new CadastrarEventoUseCase(eventos, sync, location, ids)),
    editarEvento: tx(new EditarEventoUseCase(eventos, sync)),
    removerEvento: tx(new RemoverEventoUseCase(eventos, sync)),
  };

  let sessao: AuthSession | null = null;

  const bag = {
    gateways: { auth, camera, location, sync },
    repositories: { clientes, pedidos, obras, eventos },
    useCases,
    get usuarioId(): string {
      if (!sessao) throw new SessaoNaoDisponivelError();
      return sessao.userId;
    },
    registrarSessao(nova: AuthSession | null): void {
      sessao = nova;
    },
    async loadData(): Promise<DadosCarregados> {
      if (!sessao) return { pedidos: [], obras: [], eventos: [], clientes: [] };
      const usuarioId = sessao.userId;
      const [pedidosCarregados, obrasCarregadas, eventosCarregados, clientesCarregados] =
        await Promise.all([
          useCases.consultarPedidos.execute({ usuarioId }),
          useCases.consultarEstoque.execute({ usuarioId }),
          useCases.listarEventos.execute({ usuarioId }),
          clientes.findByUsuario(usuarioId),
        ]);
      return {
        pedidos: pedidosCarregados,
        obras: obrasCarregadas,
        eventos: eventosCarregados,
        clientes: clientesCarregados,
      };
    },
  } satisfies ProviderBag;

  return bag;
}

export type SqliteProviderBag = ReturnType<typeof makeSqliteProviders>;
