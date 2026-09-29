import { Stack, type Href, useGlobalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { makeFakeProviders } from '@/main/factories/makeFakeProviders';
import { AppProviders, NavigationContext, RouteParamsContext, useAuth } from '@/presentation/hooks/AppProviders';

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useGlobalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(id) ? id[0] : id;

  return (
    <RouteParamsContext.Provider value={{ id: routeId }}>
      <NavigationContext.Provider value={{
        novoPedido: () => router.push('/pedido/novo' as Href),
        novoCliente: () => router.push('/cliente/novo' as Href),
        novaObra: () => router.push('/obra/nova' as Href),
        novoEvento: () => router.push('/evento/novo' as Href),
        editarCliente: (clienteId) => router.push({ pathname: '/cliente/[id]', params: { id: clienteId } } as Href),
        editarPedido: (pedidoId) => router.push({ pathname: '/pedido/[id]/editar', params: { id: pedidoId } } as Href),
        editarEvento: (eventoId) => router.push({ pathname: '/evento/[id]/editar', params: { id: eventoId } } as Href),
        voltar: () => router.back(),
      }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="obra/nova" options={{ title: 'Nova Obra' }} />
            <Stack.Screen name="evento/novo" options={{ title: 'Novo Evento' }} />
            <Stack.Screen name="evento/[id]/editar" options={{ title: 'Editar Evento' }} />
          </Stack.Protected>
        </Stack>
      </NavigationContext.Provider>
    </RouteParamsContext.Provider>
  );
}

export default function RootLayout() {
  const [providers] = useState(makeFakeProviders);
  return <AppProviders providers={providers}><RootNavigator /></AppProviders>;
}
