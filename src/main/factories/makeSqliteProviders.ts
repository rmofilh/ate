import type { IArmazenamentoRemoto } from '../../core/application/gateways/IArmazenamentoRemoto';
import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { IServidorRemoto } from '../../core/application/gateways/IServidorRemoto';
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
import { SincronizarAreasOfflineUseCase } from '../../core/application/usecases/SincronizarAreasOfflineUseCase';
import { SincronizarUseCase } from '../../core/application/usecases/SincronizarUseCase';
import { ResolverClienteBalcaoUseCase } from '../../core/application/usecases/ResolverClienteBalcaoUseCase';
import { VendaDiretaUseCase } from '../../core/application/usecases/VendaDiretaUseCase';
import type { ObservadorDeSessao } from '../../infrastructure/auth/SupabaseAuthGateway';
import { DonoDosDadosLocais } from '../../infrastructure/database/sqlite/DonoDosDadosLocais';
import type { DrizzleAppDb } from '../../infrastructure/database/sqlite/DrizzleDb';
import {
  type ExecutorDeTransacao,
  transacional,
} from '../../infrastructure/database/sqlite/ExecutorDeTransacao';
import { SQLiteClienteRepository } from '../../infrastructure/database/sqlite/SQLiteClienteRepository';
import { SQLiteEventoRepository } from '../../infrastructure/database/sqlite/SQLiteEventoRepository';
import { SQLiteObraRepository } from '../../infrastructure/database/sqlite/SQLiteObraRepository';
import { SQLitePedidoRepository } from '../../infrastructure/database/sqlite/SQLitePedidoRepository';
import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { ExpoGeocodingGateway } from '../../infrastructure/device/location/ExpoGeocodingGateway';
import { ExpoLocationGateway } from '../../infrastructure/device/location/ExpoLocationGateway';
import { MapaOfflineMapLibre } from '../../infrastructure/device/mapa/MapaOfflineMapLibre';
import { MonitorDeRedeExpo } from '../../infrastructure/device/rede/MonitorDeRedeExpo';
import { UuidIdGenerator } from '../../infrastructure/device/UuidIdGenerator';
import { ArmazenamentoDeFotos } from '../../infrastructure/fileSystem/ArmazenamentoDeFotos';
import { OutboxSyncGateway } from '../../infrastructure/sync/OutboxSyncGateway';
import { SQLiteEstadoLocalSync } from '../../infrastructure/sync/SQLiteEstadoLocalSync';
import { SQLiteFilaSync } from '../../infrastructure/sync/SQLiteFilaSync';
import { MotorDeSync } from '../sync/MotorDeSync';
import { protegerDonoDosDados, protegerSessaoRestaurada } from '../auth/protegerDonoDosDados';
import type { CasosDeUso, DadosCarregados, ProviderBag } from './ProviderBag';
import { SessaoNaoDisponivelError } from './SessaoNaoDisponivelError';

/** Destino remoto do sync (Supabase no app; servidor em memória nos testes). */
export interface Remoto {
  servidor: IServidorRemoto;
  armazenamento: IArmazenamentoRemoto;
}

/**
 * Composition root do runtime: SQLite + fila outbox. Casos de uso que escrevem rodam em
 * transação (registro e fila juntos). Câmera, fotos, GPS, busca de endereço e auth (Supabase,
 * injetado aqui) são reais. O D4 protege os dados locais no login e na sessão restaurada.
 * Com `remoto`, o motor de sync envia a fila e traz as mudanças do servidor; cada escrita
 * do usuário agenda um ciclo.
 */
export function makeSqliteProviders(
  db: DrizzleAppDb,
  executor: ExecutorDeTransacao,
  authBruto: IAuthGateway,
  remoto?: Remoto,
) {
  const ids = new UuidIdGenerator();
  const clientes = new SQLiteClienteRepository(db);
  const pedidos = new SQLitePedidoRepository(db);
  const obras = new SQLiteObraRepository(db);
  const eventos = new SQLiteEventoRepository(db);
  const donoDosDados = new DonoDosDadosLocais(db);
  const auth = protegerSessaoRestaurada(authBruto, donoDosDados);
  const armazenamentoDeFotos = new ArmazenamentoDeFotos(
    db,
    ids,
    undefined,
    __DEV__ ? (mensagem) => console.log(mensagem) : undefined,
  );
  const camera = new ExpoCameraGateway(armazenamentoDeFotos);
  const location = new ExpoLocationGateway();
  const geocodificador = new ExpoGeocodingGateway();
  const sync = new OutboxSyncGateway(db, ids);
  let sessao: AuthSession | null = null;
  const motorDeSync = remoto
    ? new MotorDeSync(
        new SincronizarUseCase({
          fila: new SQLiteFilaSync(db, executor),
          estado: new SQLiteEstadoLocalSync(db, executor, ids),
          servidor: remoto.servidor,
          armazenamento: remoto.armazenamento,
        }),
        () => sessao?.userId ?? null,
      )
    : undefined;
  /** Caso de uso que escreve: transação e, depois do commit, um ciclo de sync agendado. */
  const tx = <U extends { execute(...args: never[]): Promise<unknown> }>(casoDeUso: U): U => {
    const transacionado = transacional(casoDeUso, executor);
    if (!motorDeSync) return transacionado;
    const executar = transacionado.execute.bind(transacionado);
    transacionado.execute = (async (...args: never[]) => {
      const resultado = await executar(...args);
      motorDeSync.agendar();
      return resultado;
    }) as U['execute'];
    return transacionado;
  };
  // Manutenção da leitura (garante o Cliente Avulso): sem gatilho de sync, para não girar em
  // falso a cada recarga; o que ela enfileira sobe no próximo ciclo.
  const resolverClienteBalcao = transacional(
    new ResolverClienteBalcaoUseCase(clientes, sync, ids),
    executor,
  );

  const useCases: CasosDeUso = {
    login: protegerDonoDosDados(new LoginUseCase(authBruto), authBruto, donoDosDados),
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

  // Áreas de mapa offline dos eventos (só no app instalado; no Expo Go não há MapLibre).
  const mapaOffline = MapaOfflineMapLibre.criar();
  const areasOffline = mapaOffline ? new SincronizarAreasOfflineUseCase(mapaOffline) : undefined;

  const bag = {
    gateways: { auth, camera, location, geocodificador, sync },
    repositories: { clientes, pedidos, obras, eventos },
    useCases,
    ponteDaCamera: camera,
    motorDeSync,
    areasOffline,
    rede: new MonitorDeRedeExpo(),
    async aoIniciar(): Promise<void> {
      await armazenamentoDeFotos.limparOrfas();
    },
    /**
     * D4, "Apagar dados locais e entrar": autentica a outra conta ANTES de apagar. Se o login
     * falhar (senha, rede), nada é apagado. Depois apaga banco e fotos e registra o novo dono.
     */
    async apagarDadosEEntrar(credenciais: { email: string; password: string }): Promise<AuthSession> {
      const nova = await new LoginUseCase(authBruto).execute(credenciais);
      await executor.executar(async () => {
        await donoDosDados.apagarTudo();
        await donoDosDados.registrar(nova.userId);
      });
      armazenamentoDeFotos.apagarArquivos();
      return nova;
    },
    get usuarioId(): string {
      if (!sessao) throw new SessaoNaoDisponivelError();
      return sessao.userId;
    },
    /** Sessão encerrada pelo servidor com o app aberto (onAuthStateChange → SIGNED_OUT). */
    aoEncerrarSessao(ouvinte: () => void): () => void {
      const observador = authBruto as Partial<ObservadorDeSessao>;
      return typeof observador.aoEncerrarSessao === 'function'
        ? observador.aoEncerrarSessao(ouvinte)
        : () => {};
    },
    registrarSessao(nova: AuthSession | null): void {
      sessao = nova;
      if (!nova) motorDeSync?.parar();
    },
    async loadData(): Promise<DadosCarregados> {
      if (!sessao) return { pedidos: [], obras: [], eventos: [], clientes: [] };
      const usuarioId = sessao.userId;
      // O Cliente Avulso precisa existir antes da primeira venda direta: Novo Pedido o oferece fixado.
      await resolverClienteBalcao.execute({ usuarioId });
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
