import { useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { PedidoCard } from '@/presentation/components/PedidoCard';
import { ActionButton } from '@/presentation/components/ActionButton';
import { borderRadius, borderWidths, colors, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import { uiStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useNetwork,
  useServices,
} from '@/presentation/hooks/AppProviders';
import type { Pedido } from '@/core/domain/entities/Pedido';

interface TelaKanbanProps {
  onIniciar?(pedidoId: string): Promise<void>;
  onConcluir?(pedidoId: string): Promise<void>;
  onCancelar?(pedidoId: string): Promise<void>;
  pedidoAlvo?: string;
}

type StatusColuna = 'A_FAZER' | 'FAZENDO' | 'FEITO';

const MemoPedidoCard = React.memo(PedidoCard);

/**
 * Abre o drawer quando há navegador (produção); nos testes unitários a
 * tela é renderizada isolada, sem navegação — nesse caso vira no-op.
 */
function useAbrirMenu(): () => void {
  let nav: { openDrawer?: () => void } | null = null;
  try {
    // A tela também é renderizada isolada nos testes unitários, sem navegador —
    // fora do Drawer o botão de menu vira no-op. O hook é ambiental, não condicional por estado.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nav = useNavigation() as unknown as { openDrawer?: () => void };
  } catch {
    nav = null;
  }
  return useCallback(() => nav?.openDrawer?.(), [nav]);
}

export default function TelaKanban({
  onIniciar,
  onConcluir,
  onCancelar,
}: TelaKanbanProps) {
  const { pedidos, clientes, reload } = useData();
  const { isOnline } = useNetwork();
  const services = useServices();
  const abrirMenuHook = useAbrirMenu();
  const busyIds = useRef(new Set<string>());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alvoCancel, setAlvoCancel] = useState<string | null>(null);
  const [erroCancel, setErroCancel] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isTablet = width >= layout.tabletBreakpoint;

  const navigation = useAppNavigation();

  async function executarUmaVez(id: string, action: () => Promise<void>) {
    if (busyIds.current.has(id)) return;

    busyIds.current.add(id);
    setLoadingId(id);
    try {
      await action();
    } finally {
      busyIds.current.delete(id);
      setLoadingId(null);
    }
  }

  async function iniciar(id: string) {
    setAviso(null);
    try {
      await executarUmaVez(id, async () => {
        if (onIniciar) await onIniciar(id);
        else {
          if (!services) throw new Error('Serviço de pedidos indisponível');
          await services.useCases.iniciarProducao.execute({ pedidoId: id });
        }
        await reload();
      });
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'Não foi possível iniciar o pedido');
    }
  }

  async function concluir(id: string) {
    setAviso(null);
    try {
      await executarUmaVez(id, async () => {
        if (onConcluir) await onConcluir(id);
        else {
          if (!services) throw new Error('Serviço de pedidos indisponível');
          const fotoPath = await services.gateways.camera.capture();
          if (!fotoPath) throw new Error('Foto obrigatória para concluir o pedido.');
          await services.useCases.concluirPedido.execute({ pedidoId: id, fotoPath });
        }
        await reload();
      });
    } catch (error) {
      setAviso(
        error instanceof Error ? error.message : 'Foto obrigatória para concluir o pedido.',
      );
    }
  }

  async function cancelarConfirmado() {
    if (!alvoCancel) return;

    const id = alvoCancel;
    setAlvoCancel(null);
    setErroCancel(null);
    try {
      await executarUmaVez(id, async () => {
        if (onCancelar) await onCancelar(id);
        else {
          if (!services) throw new Error('Serviço de pedidos indisponível');
          await services.useCases.cancelarPedido.execute({ pedidoId: id, confirmado: true });
        }
        await reload();
      });
    } catch (error) {
      setErroCancel(
        error instanceof Error ? error.message : 'Não foi possível cancelar o pedido',
      );
    }
  }

  const pedidosPorStatus = useMemo(() => {
    const grupos: Record<StatusColuna, Pedido[]> = { A_FAZER: [], FAZENDO: [], FEITO: [] };
    for (const pedido of pedidos) grupos[pedido.status].push(pedido);
    return grupos;
  }, [pedidos]);

  const renderItem = useCallback(
    ({ item: pedido }: { item: Pedido }) => {
      const cliente = clientes.find((candidate) => candidate.id === pedido.clienteId);
      const clienteBalcao = cliente?.nome === 'Cliente Avulso' && cliente.contato === '';
      return (
        <MemoPedidoCard
          pedido={pedido}
          loading={loadingId === pedido.id}
          compact={!isTablet}
          onIniciar={() => void iniciar(pedido.id)}
          onConcluir={() => void concluir(pedido.id)}
          onCancelar={() => setAlvoCancel(pedido.id)}
          onEditarPedido={
            pedido.status === 'A_FAZER' ? () => navigation.editarPedido(pedido.id) : undefined
          }
          onEditarCliente={
            cliente && !clienteBalcao ? () => navigation.editarCliente(pedido.clienteId) : undefined
          }
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes, loadingId, isTablet],
  );

  const keyExtractor = useCallback((pedido: Pedido) => pedido.id, []);

  function abrirMenu() {
    abrirMenuHook();
  }

  function coluna(status: StatusColuna, label: string) {
    const pedidosDaColuna = pedidosPorStatus[status];
    const titulo = status === 'A_FAZER' ? 'A Fazer' : status === 'FAZENDO' ? 'Fazendo' : 'Feito';

    return (
      <View
        testID={label}
        accessibilityLabel={`Coluna ${titulo}, ${pedidosDaColuna.length} pedidos`}
        style={[styles.column, styles.columnCard, isTablet && styles.tabletColumn]}
      >
        <View
          style={[
            styles.columnHeader,
            status === 'FAZENDO' && styles.headerDoing,
            status === 'FEITO' && styles.headerDone,
          ]}
        >
          <Text accessibilityRole="header" style={styles.columnTitle}>
            {titulo}
          </Text>
          <View accessible={false} style={styles.countPill}>
            <Text style={styles.countText}>{pedidosDaColuna.length}</Text>
          </View>
        </View>
        <FlatList
          data={pedidosDaColuna}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          scrollEnabled
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          ListEmptyComponent={
            <Text style={[uiStyles.empty, styles.emptyFix]}>
              Nenhum pedido aqui — toque em Novo Pedido
            </Text>
          }
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={uiStyles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View testID="scroll-kanban" style={styles.screen}>
        <OfflineBanner isOnline={isOnline} />
        <View style={styles.toolbar}>
          <Pressable
            testID="botao-menu"
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
            onPress={abrirMenu}
            style={styles.menuButton}
          >
            <SymbolView
              accessible={false}
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              size={fontSizes.title}
              tintColor={colors.text}
            />
          </Pressable>
          <Text accessibilityRole="header" style={styles.toolbarTitle}>
            Meus Pedidos
          </Text>
          <ActionButton
            label="novo-pedido"
            title="+ Novo"
            onPress={navigation.novoPedido}
            appearance="primary"
            style={styles.newOrder}
          />
        </View>
        {aviso ? (
          <Text testID="aviso-foto-obrigatoria" style={uiStyles.notice}>
            {aviso}
          </Text>
        ) : null}
        {erroCancel ? (
          <Text testID="erro-cancelar" style={uiStyles.error}>
            {erroCancel}
          </Text>
        ) : null}
        {isTablet ? (
          <View style={[styles.board, styles.tabletBoard]}>
            {coluna('A_FAZER', 'coluna-a-fazer')}
            {coluna('FAZENDO', 'coluna-fazendo')}
            {coluna('FEITO', 'coluna-feito')}
          </View>
        ) : (
          <View style={styles.board}>
            <View testID="linha-superior" style={styles.topRow}>
              {coluna('A_FAZER', 'coluna-a-fazer')}
              {coluna('FAZENDO', 'coluna-fazendo')}
            </View>
            <View testID="linha-inferior" style={styles.bottomRow}>
              {coluna('FEITO', 'coluna-feito')}
            </View>
          </View>
        )}
      </View>
      {alvoCancel ? (
        <ConfirmationLayer>
          <ConfirmDialog
            titulo="Cancelar este pedido? O estoque vinculado será devolvido."
            onCancel={() => setAlvoCancel(null)}
            onConfirm={() => void cancelarConfirmado()}
            appearance="panel"
          />
        </ConfirmationLayer>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x2,
    gap: spacing.x2,
  },
  toolbar: {
    flexDirection: 'row',
    gap: spacing.x2,
    alignItems: 'center',
  },
  menuButton: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surface,
  },
  toolbarTitle: {
    ...textStyles.label,
    color: colors.text,
    flex: 1,
  },
  newOrder: {
    minHeight: layout.minTouchTarget,
  },
  board: {
    flex: 1,
    gap: spacing.x2,
  },
  tabletBoard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.x4,
  },
  topRow: {
    flex: 1.15,
    flexDirection: 'row',
    gap: spacing.x2,
    minHeight: 0,
  },
  bottomRow: {
    flex: 0.85,
    minHeight: 0,
  },
  column: {
    gap: spacing.x2,
    minHeight: 0,
  },
  columnCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.x2,
    minWidth: 0,
  },
  tabletColumn: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.x2,
    backgroundColor: colors.surface,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.control,
    paddingHorizontal: spacing.x2,
    paddingVertical: spacing.x2,
  },
  headerDoing: {
    backgroundColor: colors.primary,
  },
  headerDone: {
    backgroundColor: colors.surfaceSecondary,
  },
  columnTitle: {
    ...textStyles.label,
    color: colors.text,
    flex: 1,
  },
  countPill: {
    backgroundColor: colors.surface,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.control,
    paddingHorizontal: spacing.x2,
    paddingVertical: spacing.x1,
    minWidth: spacing.x8,
    alignItems: 'center',
  },
  countText: {
    ...textStyles.label,
    color: colors.text,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    gap: spacing.x2,
    paddingBottom: spacing.x2,
  },
  emptyFix: {
    borderRadius: borderRadius.control,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
  },
});
