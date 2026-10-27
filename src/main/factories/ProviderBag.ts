import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { ICameraGateway } from '../../core/application/gateways/ICameraGateway';
import type { ILocationGateway } from '../../core/application/gateways/ILocationGateway';
import type { ISyncGateway } from '../../core/application/gateways/ISyncGateway';
import type { IClienteRepository } from '../../core/application/repositories/IClienteRepository';
import type { IEventoRepository } from '../../core/application/repositories/IEventoRepository';
import type { IObraRepository } from '../../core/application/repositories/IObraRepository';
import type { IPedidoRepository } from '../../core/application/repositories/IPedidoRepository';
import type { AdicionarUnidadesUseCase } from '../../core/application/usecases/AdicionarUnidadesUseCase';
import type { CadastrarClienteUseCase } from '../../core/application/usecases/CadastrarClienteUseCase';
import type { CadastrarEventoUseCase } from '../../core/application/usecases/CadastrarEventoUseCase';
import type { CadastrarObraUseCase } from '../../core/application/usecases/CadastrarObraUseCase';
import type { CadastrarPedidoUseCase } from '../../core/application/usecases/CadastrarPedidoUseCase';
import type { CancelarPedidoUseCase } from '../../core/application/usecases/CancelarPedidoUseCase';
import type { ConcluirPedidoUseCase } from '../../core/application/usecases/ConcluirPedidoUseCase';
import type { ConsultarEstoqueUseCase } from '../../core/application/usecases/ConsultarEstoqueUseCase';
import type { ConsultarPedidosUseCase } from '../../core/application/usecases/ConsultarPedidosUseCase';
import type { EditarClienteUseCase } from '../../core/application/usecases/EditarClienteUseCase';
import type { EditarEventoUseCase } from '../../core/application/usecases/EditarEventoUseCase';
import type { EditarPedidoUseCase } from '../../core/application/usecases/EditarPedidoUseCase';
import type { IniciarProducaoUseCase } from '../../core/application/usecases/IniciarProducaoUseCase';
import type { ListarEventosUseCase } from '../../core/application/usecases/ListarEventosUseCase';
import type { LoginUseCase } from '../../core/application/usecases/LoginUseCase';
import type { LogoutUseCase } from '../../core/application/usecases/LogoutUseCase';
import type { RemoverEventoUseCase } from '../../core/application/usecases/RemoverEventoUseCase';
import type { RemoverObraUseCase } from '../../core/application/usecases/RemoverObraUseCase';
import type { RemoverUnidadesUseCase } from '../../core/application/usecases/RemoverUnidadesUseCase';
import type { VendaDiretaUseCase } from '../../core/application/usecases/VendaDiretaUseCase';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Pedido } from '../../core/domain/entities/Pedido';

export interface DadosCarregados {
  pedidos: Pedido[];
  obras: Obra[];
  eventos: Evento[];
  clientes: Cliente[];
}

export interface CasosDeUso {
  login: LoginUseCase;
  logout: LogoutUseCase;
  consultarPedidos: ConsultarPedidosUseCase;
  iniciarProducao: IniciarProducaoUseCase;
  concluirPedido: ConcluirPedidoUseCase;
  cancelarPedido: CancelarPedidoUseCase;
  cadastrarPedido: CadastrarPedidoUseCase;
  editarPedido: EditarPedidoUseCase;
  cadastrarCliente: CadastrarClienteUseCase;
  editarCliente: EditarClienteUseCase;
  consultarEstoque: ConsultarEstoqueUseCase;
  cadastrarObra: CadastrarObraUseCase;
  adicionarUnidades: AdicionarUnidadesUseCase;
  removerUnidades: RemoverUnidadesUseCase;
  removerObra: RemoverObraUseCase;
  vendaDireta: VendaDiretaUseCase;
  listarEventos: ListarEventosUseCase;
  cadastrarEvento: CadastrarEventoUseCase;
  editarEvento: EditarEventoUseCase;
  removerEvento: RemoverEventoUseCase;
}

/**
 * Tipo estrutural que o AppProviders aceita. A bag SQLite (runtime) e a bag fake (testes)
 * satisfazem este tipo; os testes continuam usando o tipo concreto da fake.
 */
export interface ProviderBag {
  gateways: {
    auth: IAuthGateway;
    camera: ICameraGateway;
    location: ILocationGateway;
    sync: ISyncGateway;
  };
  repositories: {
    clientes: IClienteRepository;
    pedidos: IPedidoRepository;
    obras: IObraRepository;
    eventos: IEventoRepository;
  };
  useCases: CasosDeUso;
  readonly usuarioId: string;
  loadData(): Promise<DadosCarregados>;
  /** Informa a sessão ativa (ou null no logout). Ausente na bag fake. */
  registrarSessao?(sessao: AuthSession | null): void;
  /** Dados iniciais opcionais (só a bag fake com fixtures). */
  pedidos?: Pedido[];
  obras?: Obra[];
  eventos?: Evento[];
  clientes?: Cliente[];
}
