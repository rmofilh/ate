import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { textStyles } from '@/constants/theme';
import { makeFakeProviders } from '@/main/factories/makeFakeProviders';
import { FontLoader } from '@/presentation/components/FontLoader';
import { AppProviders, NavigationContext, RouteParamsContext, useAuth } from '@/presentation/hooks/AppProviders';
import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const { colors, scheme } = useDesignTheme();

  return (
    <RouteParamsContext.Provider value={{}}>
      <NavigationContext.Provider value={{
        novoPedido: () => router.push('/pedido/novo'),
        novoCliente: () => router.push('/cliente/novo'),
        novaObra: () => router.push('/obra/nova'),
        novoEvento: () => router.push('/evento/novo'),
        editarCliente: (clienteId) => router.push({ pathname: '/cliente/[id]', params: { id: clienteId } }),
        editarPedido: (pedidoId) => router.push({ pathname: '/pedido/[id]/editar', params: { id: pedidoId } }),
        editarEvento: (eventoId) => router.push({ pathname: '/evento/[id]/editar', params: { id: eventoId } }),
        voltar: () => router.back(),
      }}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { ...textStyles.heading },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="obra/nova" options={{ title: 'Nova Obra' }} />
            <Stack.Screen name="evento/novo" options={{ title: 'Novo Evento' }} />
            <Stack.Screen name="evento/[id]/editar" options={{ title: 'Editar Evento' }} />
            <Stack.Screen name="pedido/novo" options={{ title: 'Novo Pedido' }} />
            <Stack.Screen name="cliente/novo" options={{ title: 'Novo Cliente' }} />
            <Stack.Screen name="cliente/[id]" options={{ title: 'Editar Cliente' }} />
            <Stack.Screen name="pedido/[id]/editar" options={{ title: 'Editar Pedido' }} />
          </Stack.Protected>
        </Stack>
      </NavigationContext.Provider>
    </RouteParamsContext.Provider>
  );
}

export default function RootLayout() {
  const [providers] = useState(makeFakeProviders);
  return (
    <FontLoader>
      <AppProviders providers={providers}><RootNavigator /></AppProviders>
    </FontLoader>
  );
}
