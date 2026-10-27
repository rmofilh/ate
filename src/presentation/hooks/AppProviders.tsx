import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import type { AuthSession } from '../../core/application/gateways/IAuthGateway';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Pedido } from '../../core/domain/entities/Pedido';
import type { ProviderBag } from '../../main/factories/ProviderBag';
import { CameraHost } from '../components/camera/CameraHost';

export interface AuthCtx {
  session: AuthSession | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
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

  useEffect(() => {
    void providers.gateways.auth.getSession().then((restaurada) => {
      providers.registrarSessao?.(restaurada);
      setSession(restaurada);
    });
  }, [providers]);

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

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
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

export function NetworkProvider({ children }: React.PropsWithChildren) {
  const [isOnline, setOnline] = useState(true);

  return (
    <NetworkContext.Provider value={{ isOnline, setOnline }}>
      {children}
    </NetworkContext.Provider>
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
          <NetworkProvider>
            <PedidoDraftProvider>
              {children}
              <CameraHost ponte={providers.ponteDaCamera} />
            </PedidoDraftProvider>
          </NetworkProvider>
        </DataProvider>
      </AuthProvider>
    </ServicesContext.Provider>
  );
}
