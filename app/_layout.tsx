import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { makeFakeProviders } from '../src/main/factories/makeFakeProviders';
import {
  AppProviders,
  NavigationContext,
  RouteParamsContext,
  useAuth,
} from '../src/presentation/hooks/AppProviders';

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { id } = useGlobalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    const isAuthRoute = segments[0] === '(auth)';

    if (!session && !isAuthRoute) router.replace('/(auth)/login');
    if (session && isAuthRoute) router.replace('/(tabs)/kanban');
  }, [router, segments, session]);

  return (
    <RouteParamsContext.Provider value={{ id: routeId }}>
      <NavigationContext.Provider
        value={{
          novoPedido: () => router.push('/pedido/novo'),
          novoCliente: () => router.push('/cliente/novo'),
          novaObra: () => router.push('/obra/nova'),
          novoEvento: () => router.push('/evento/novo'),
          editarCliente: (clienteId) =>
            router.push({ pathname: '/cliente/[id]', params: { id: clienteId } }),
          editarPedido: (pedidoId) =>
            router.push({ pathname: '/pedido/[id]/editar', params: { id: pedidoId } }),
          editarEvento: (eventoId) =>
            router.push({ pathname: '/evento/[id]/editar', params: { id: eventoId } }),
          voltar: () => router.back(),
        }}
      >
        <Stack screenOptions={{ headerShown: true }} />
      </NavigationContext.Provider>
    </RouteParamsContext.Provider>
  );
}

export default function RootLayout() {
  const [providers] = useState(makeFakeProviders);

  return (
    <AppProviders providers={providers}>
      <RootNavigator />
    </AppProviders>
  );
}
