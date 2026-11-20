import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import type { AuthSession } from '../../core/application/gateways/IAuthGateway';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Pedido } from '../../core/domain/entities/Pedido';
import type { ProviderBag } from '../../main/factories/ProviderBag';
import type { EstadoDoSync } from '../../main/sync/MotorDeSync';
import { CameraHost } from '../components/camera/CameraHost';

export interface AuthCtx {
  session: AuthSession | null;
  /** true enquanto a sessão guardada é lida na abertura do app. */
  restaurando?: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  /** D4: entra com a outra conta e, só depois de autenticar, apaga os dados locais deste aparelho. */
  apagarDadosEEntrar?(email: string, password: string): Promise<void>;
}

export interface DataCtx {
  pedidos: Pedido[];
  obras: Obra[];
  eventos: Evento[];
  clientes: Cliente[];
  /** Falha da última leitura dos dados locais (null quando ok). */
  erro?: string | null;
  reload(): Promise<void>;
}

export interface NetCtx {
  isOnline: boolean;
  setOnline(isOnline: boolean): void;
}

export interface SyncCtx {
  /** null quando não há servidor remoto (bag fake dos testes). */
  estado: EstadoDoSync | null;
  sincronizarAgora(): Promise<void>;
  tentarDeNovo(): Promise<void>;
}

export interface NavigationCtx {
  novoPedido(): void;
  novoCliente(): void;
  novaObra(): void;
  novoEvento(): void;
  editarCliente(clienteId: string): void;
  editarPedido(pedidoId: string): void;
  editarEvento(eventoId: string): void;
  voltar(): void;
}

export interface RouteParamsCtx {
  id?: string;
}

export interface PedidoDraftCtx {
  clienteId: string | null;
  selecionarCliente(clienteId: string): void;
  limpar(): void;
}

export const AuthContext = createContext<AuthCtx>({
  session: null,
  login: async () => {},
  logout: async () => {},
});
export const DataContext = createContext<DataCtx>({
  pedidos: [],
  obras: [],
  eventos: [],
  clientes: [],
  erro: null,
  reload: async () => {},
});
export const SyncContext = createContext<SyncCtx>({
  estado: null,
  sincronizarAgora: async () => {},
  tentarDeNovo: async () => {},
});
export const NetworkContext = createContext<NetCtx>({
  isOnline: true,
  setOnline: () => {},
});
export const NavigationContext = createContext<NavigationCtx>({
  novoPedido: () => {},
  novoCliente: () => {},
  novaObra: () => {},
  novoEvento: () => {},
  editarCliente: () => {},
  editarPedido: () => {},
  editarEvento: () => {},
  voltar: () => {},
});
export const RouteParamsContext = createContext<RouteParamsCtx>({});
export const PedidoDraftContext = createContext<PedidoDraftCtx>({
  clienteId: null,
  selecionarCliente: () => {},
  limpar: () => {},
});
export const ServicesContext = createContext<ProviderBag | null>(null);

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

export function useData(): DataCtx {
  return useContext(DataContext);
}

export function useNetwork(): NetCtx {
  return useContext(NetworkContext);
}

export function useSync(): SyncCtx {
  return useContext(SyncContext);
}

export function useServices(): ProviderBag | null {
  return useContext(ServicesContext);
}

export function useAppNavigation(): NavigationCtx {
  return useContext(NavigationContext);
}

export function useRouteParams(): RouteParamsCtx {
  const override = useContext(RouteParamsContext);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  return { id: override.id ?? routeId };
}

export function usePedidoDraft(): PedidoDraftCtx {
  return useContext(PedidoDraftContext);
}

export function AuthProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers: ProviderBag }>) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restaurando, setRestaurando] = useState(true);

  useEffect(() => {
    let ativo = true;
    providers.gateways.auth
      .getSession()
      .then(
        (restaurada) => {
          if (!ativo) return;
          providers.registrarSessao?.(restaurada);
          setSession(restaurada);
        },
        () => undefined,
      )
      .finally(() => {
        if (ativo) setRestaurando(false);
      });
    return () => {
      ativo = false;
    };
  }, [providers]);

  // O servidor encerrou a sessão com o app aberto (ex.: acesso revogado): volta ao login.
  useEffect(
    () =>
      providers.aoEncerrarSessao?.(() => {
        providers.registrarSessao?.(null);
        setSession(null);
      }),
    [providers],
  );

  async function login(email: string, password: string): Promise<void> {
    const nextSession = await providers.useCases.login.execute({ email, password });
    providers.registrarSessao?.(nextSession);
    setSession(nextSession);
  }

  async function logout(): Promise<void> {
    await providers.useCases.logout.execute();
    providers.registrarSessao?.(null);
    setSession(null);
  }

  async function apagarDadosEEntrar(email: string, password: string): Promise<void> {
    if (!providers.apagarDadosEEntrar) return;
    const nextSession = await providers.apagarDadosEEntrar({ email, password });
    providers.registrarSessao?.(nextSession);
    setSession(nextSession);
  }

  return (
    <AuthContext.Provider value={{ session, restaurando, login, logout, apagarDadosEEntrar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function DataProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers: ProviderBag }>) {
  const { session } = useAuth();
  const [data, setData] = useState(() => ({
    pedidos: providers.pedidos ?? [],
    obras: providers.obras ?? [],
    eventos: providers.eventos ?? [],
    clientes: providers.clientes ?? [],
  }));
  const [erro, setErro] = useState<string | null>(null);
  const [sessaoVista, setSessaoVista] = useState(session);

  // Zera os dados só na saída (sessão → null), nunca na montagem sem sessão.
  if (sessaoVista !== session) {
    setSessaoVista(session);
    if (sessaoVista && !session) {
      setData({ pedidos: [], obras: [], eventos: [], clientes: [] });
      setErro(null);
    }
  }

  async function reload(): Promise<void> {
    try {
      setData(await providers.loadData());
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao ler o banco local');
      throw error;
    }
  }

  // Recarrega a cada nova sessão; a falha fica em `erro` e aparece na área logada.
  useEffect(() => {
    if (!session) return;
    let ativo = true;
    providers.loadData().then(
      (carregados) => {
        if (!ativo) return;
        setData(carregados);
        setErro(null);
      },
      (error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : 'Erro ao ler o banco local');
      },
    );
    return () => {
      ativo = false;
    };
  }, [providers, session]);

  return (
    <DataContext.Provider value={{ ...data, erro, reload }}>{children}</DataContext.Provider>
  );
}

/** Conexão real do aparelho (expo-network). Sem monitor (bag fake), o app se considera online. */
export function NetworkProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers?: ProviderBag }>) {
  const [isOnline, setOnline] = useState(true);
  const rede = providers?.rede;

  useEffect(() => {
    if (!rede) return;
    let ativo = true;
    void rede.estaOnline().then((online) => {
      if (ativo) setOnline(online);
    });
    const parar = rede.observar(setOnline);
    return () => {
      ativo = false;
      parar();
    };
  }, [rede]);

  return (
    <NetworkContext.Provider value={{ isOnline, setOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Gatilhos do sync: ao entrar (sessão nova), ao reconectar e ao voltar o app para o primeiro
 * plano. Depois de um ciclo que mudou dados locais, recarrega as telas. A escrita local agenda
 * o próprio ciclo no composition root.
 */
export function SyncProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers: ProviderBag }>) {
  const motor = providers.motorDeSync;
  const { session } = useAuth();
  const { reload, eventos } = useData();
  const { isOnline } = useNetwork();
  const [estado, setEstado] = useState<EstadoDoSync | null>(() => motor?.obterEstado() ?? null);
  const recarregar = useRef(reload);
  const sessaoAtiva = useRef(!!session);
  const estavaOnline = useRef(isOnline);

  useEffect(() => {
    recarregar.current = reload;
    sessaoAtiva.current = !!session;
  });

  useEffect(() => {
    if (!motor) return;
    const pararEstado = motor.observar(setEstado);
    const pararDados = motor.aoMudarDados(() => {
      recarregar.current().catch(() => undefined);
    });
    void motor.atualizarResumo();
    const assinatura = AppState.addEventListener('change', (estadoDoApp) => {
      if (estadoDoApp === 'active' && sessaoAtiva.current) void motor.sincronizarAgora();
    });
    return () => {
      pararEstado();
      pararDados();
      assinatura.remove();
    };
  }, [motor]);

  useEffect(() => {
    if (motor && session) void motor.sincronizarAgora();
  }, [motor, session]);

  useEffect(() => {
    const reconectou = isOnline && !estavaOnline.current;
    estavaOnline.current = isOnline;
    if (motor && reconectou && sessaoAtiva.current) void motor.sincronizarAgora();
  }, [motor, isOnline]);

  // Mapa offline: com internet, mantém baixada a área de cada evento (inclui os vindos do pull).
  const areasOffline = providers.areasOffline;
  useEffect(() => {
    if (!areasOffline || !session || !isOnline) return;
    void areasOffline.execute({ eventos });
  }, [areasOffline, session, isOnline, eventos]);

  async function sincronizarAgora(): Promise<void> {
    await motor?.sincronizarAgora();
  }

  async function tentarDeNovo(): Promise<void> {
    await motor?.tentarDeNovo();
  }

  return (
    <SyncContext.Provider value={{ estado, sincronizarAgora, tentarDeNovo }}>
      {children}
    </SyncContext.Provider>
  );
}

export function PedidoDraftProvider({ children }: React.PropsWithChildren) {
  const [clienteId, setClienteId] = useState<string | null>(null);

  return (
    <PedidoDraftContext.Provider
      value={{
        clienteId,
        selecionarCliente: setClienteId,
        limpar: () => setClienteId(null),
      }}
    >
      {children}
    </PedidoDraftContext.Provider>
  );
}

export function AppProviders({
  providers,
  children,
}: React.PropsWithChildren<{ providers: ProviderBag }>) {
  // Manutenção na abertura (ex.: fotos órfãs). Falha só é registrada: o app segue utilizável.
  useEffect(() => {
    providers.aoIniciar?.().catch((erro: unknown) => {
      console.warn('Falha na manutenção inicial', erro);
    });
  }, [providers]);

  return (
    <ServicesContext.Provider value={providers}>
      <AuthProvider providers={providers}>
        <DataProvider providers={providers}>
          <NetworkProvider providers={providers}>
            <SyncProvider providers={providers}>
              <PedidoDraftProvider>
                {children}
                <CameraHost ponte={providers.ponteDaCamera} />
              </PedidoDraftProvider>
            </SyncProvider>
          </NetworkProvider>
        </DataProvider>
      </AuthProvider>
    </ServicesContext.Provider>
  );
}
