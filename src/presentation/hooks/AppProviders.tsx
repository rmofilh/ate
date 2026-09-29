import React, { createContext, useContext, useEffect, useState } from 'react';

import type { AuthSession } from '../../core/application/gateways/IAuthGateway';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Pedido } from '../../core/domain/entities/Pedido';
import type { FakeProviderBag } from '../../main/factories/makeFakeProviders';

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
export const ServicesContext = createContext<FakeProviderBag | null>(null);

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}

export function useData(): DataCtx {
  return useContext(DataContext);
}

export function useNetwork(): NetCtx {
  return useContext(NetworkContext);
}

export function useServices(): FakeProviderBag | null {
  return useContext(ServicesContext);
}

export function useAppNavigation(): NavigationCtx {
  return useContext(NavigationContext);
}

export function useRouteParams(): RouteParamsCtx {
  return useContext(RouteParamsContext);
}

export function usePedidoDraft(): PedidoDraftCtx {
  return useContext(PedidoDraftContext);
}

export function AuthProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers: FakeProviderBag }>) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    void providers.gateways.auth.getSession().then(setSession);
  }, [providers]);

  async function login(email: string, password: string): Promise<void> {
    const nextSession = await providers.useCases.login.execute({ email, password });
    setSession(nextSession);
  }

  async function logout(): Promise<void> {
    await providers.useCases.logout.execute();
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function DataProvider({
  providers,
  children,
}: React.PropsWithChildren<{ providers: FakeProviderBag }>) {
  const [data, setData] = useState(() => ({
    pedidos: providers.pedidos,
    obras: providers.obras,
    eventos: providers.eventos,
    clientes: providers.clientes,
  }));

  async function reload(): Promise<void> {
    setData(await providers.loadData());
  }

  return <DataContext.Provider value={{ ...data, reload }}>{children}</DataContext.Provider>;
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
}: React.PropsWithChildren<{ providers: FakeProviderBag }>) {
  return (
    <ServicesContext.Provider value={providers}>
      <AuthProvider providers={providers}>
        <DataProvider providers={providers}>
          <NetworkProvider>
            <PedidoDraftProvider>{children}</PedidoDraftProvider>
          </NetworkProvider>
        </DataProvider>
      </AuthProvider>
    </ServicesContext.Provider>
  );
}
