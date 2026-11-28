import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { borderRadius, spacing, textStyles } from '@/constants/theme';
import type { Cliente } from '@/core/domain/entities/Cliente';
import { AppIcon } from '@/presentation/components/AppIcon';
import { ErroDadosBanner } from '@/presentation/components/ErroDadosBanner';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { ScreenHeader } from '@/presentation/components/ScreenHeader';
import { useAppNavigation, useData, useNetwork } from '@/presentation/hooks/AppProviders';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

/** O "Cliente Avulso" é interno das vendas diretas: não aparece na lista nem pode ser editado. */
function ehBalcao(cliente: Cliente): boolean {
  return cliente.nome === 'Cliente Avulso' && cliente.contato === '';
}

function textoDePedidos(emAberto: number): string {
  if (emAberto === 0) return 'Nenhum pedido em aberto';
  return `${emAberto} ${emAberto === 1 ? 'pedido em aberto' : 'pedidos em aberto'}`;
}

/** Lista de clientes (RF06/RF18): ver quem são, quantos pedidos em aberto têm, editar e cadastrar. */
export default function TelaClientes() {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const { clientes, pedidos } = useData();
  const { isOnline } = useNetwork();
  const navigation = useAppNavigation();

  const lista = useMemo(() => {
    const emAberto = new Map<string, number>();
    for (const pedido of pedidos) {
      if (pedido.status === 'FEITO') continue;
      emAberto.set(pedido.clienteId, (emAberto.get(pedido.clienteId) ?? 0) + 1);
    }
    return clientes
      .filter((cliente) => !ehBalcao(cliente))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((cliente) => ({ cliente, emAberto: emAberto.get(cliente.id) ?? 0 }));
  }, [clientes, pedidos]);

  return (
    <SafeAreaView style={uiStyles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <FlatList
        testID="scroll-clientes"
        data={lista}
        keyExtractor={({ cliente }) => cliente.id}
        contentContainerStyle={uiStyles.scrollContent}
        ListHeaderComponent={
          <View style={[uiStyles.listColumn, styles.cabecalho]}>
            <OfflineBanner isOnline={isOnline} />
            <ErroDadosBanner />
            <ScreenHeader
              title="Clientes"
              action={{ testID: 'novo-cliente', title: 'Novo Cliente', onPress: navigation.novoCliente }}
            />
            <Text style={uiStyles.muted}>Quem confia nas suas criações.</Text>
          </View>
        }
        ListEmptyComponent={
          <Text testID="clientes-vazio" style={uiStyles.empty}>
            Nenhum cliente ainda — toque em Novo Cliente
          </Text>
        }
        renderItem={({ item: { cliente, emAberto } }) => (
          <View style={uiStyles.listColumn}>
            <Pressable
              testID={`cliente-${cliente.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${cliente.nome}, ${textoDePedidos(emAberto)}. Toque para editar`}
              onPress={() => navigation.editarCliente(cliente.id)}
              style={({ pressed }) => [styles.card, pressed && styles.pressionado]}
            >
              <View style={styles.copia}>
                <Text style={styles.nome}>{cliente.nome}</Text>
                {cliente.contato ? <Text style={uiStyles.muted}>{cliente.contato}</Text> : null}
                <Text testID={`pedidos-cliente-${cliente.id}`} style={styles.pedidos}>
                  {textoDePedidos(emAberto)}
                </Text>
              </View>
              <AppIcon name="next" color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  cabecalho: { gap: spacing.x2, paddingBottom: spacing.x2 },
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.x3,
    padding: spacing.x4,
    marginBottom: spacing.x3,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
  },
  pressionado: { backgroundColor: colors.selection },
  copia: { flex: 1, gap: spacing.x1 },
  nome: { ...textStyles.heading, color: colors.text },
  pedidos: { ...textStyles.label, color: colors.textSecondary },
}));
