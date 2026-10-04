import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { PedidoCard } from '@/presentation/components/PedidoCard';
import { KanbanBoard } from '@/presentation/components/KanbanBoard';
import { ScreenHeader } from '@/presentation/components/ScreenHeader';
import { layout, spacing } from '@/constants/theme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { sortPedidosByDelivery } from '@/presentation/utils/sortPedidosByDelivery';
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

export default function TelaKanban({
  onIniciar,
  onConcluir,
  onCancelar,
}: TelaKanbanProps) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { pedidos, clientes, obras, reload } = useData();
  const { isOnline } = useNetwork();
  const services = useServices();
  const busyIds = useRef(new Set<string>());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alvoCancel, setAlvoCancel] = useState<string | null>(null);
  const [erroCancel, setErroCancel] = useState<string | null>(null);
  const [collapsedDoneIds, setCollapsedDoneIds] = useState<ReadonlySet<string>>(() => new Set());
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
    for (const pedido of sortPedidosByDelivery(pedidos)) grupos[pedido.status].push(pedido);
    return grupos;
  }, [pedidos]);

  const allDoneCollapsed = pedidosPorStatus.FEITO.length > 0 && pedidosPorStatus.FEITO.every((pedido) => collapsedDoneIds.has(pedido.id));
  const toggleDone = useCallback((id: string) => {
    setCollapsedDoneIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function toggleAllDone() {
    setCollapsedDoneIds((previous) => {
      const next = new Set(previous);
      for (const pedido of pedidosPorStatus.FEITO) {
        if (allDoneCollapsed) next.delete(pedido.id);
        else next.add(pedido.id);
      }
      return next;
    });
  }

  const renderItem = useCallback(
    ({ item: pedido }: { item: Pedido }) => {
      const cliente = clientes.find((candidate) => candidate.id === pedido.clienteId);
      const obra = obras.find((candidate) => candidate.id === pedido.obraId);
      const clienteBalcao = cliente?.nome === 'Cliente Avulso' && cliente.contato === '';
      return (
        <MemoPedidoCard
          pedido={pedido}
          loading={loadingId === pedido.id}
          compact={!isTablet}
          clienteNome={cliente?.nome}
          obraNome={obra?.nome}
          obraTipo={obra?.tipo}
          collapsed={collapsedDoneIds.has(pedido.id)}
          onToggleCollapsed={pedido.status === 'FEITO' ? () => toggleDone(pedido.id) : undefined}
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
    [clientes, obras, loadingId, isTablet, collapsedDoneIds, toggleDone],
  );

  return (
    <SafeAreaView style={uiStyles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View testID="scroll-kanban" style={styles.screen}>
        <OfflineBanner isOnline={isOnline} />
        <ScreenHeader title="Meus Pedidos" action={{ testID: 'novo-pedido', title: 'Novo Pedido', onPress: navigation.novoPedido }} />
        {aviso ? (
          <Text testID="aviso-foto-obrigatoria" accessibilityLiveRegion="polite" style={uiStyles.notice}>
            {aviso}
          </Text>
        ) : null}
        {erroCancel ? (
          <Text testID="erro-cancelar" style={uiStyles.error}>
            {erroCancel}
          </Text>
        ) : null}
        <KanbanBoard groups={pedidosPorStatus} renderItem={renderItem} allDoneCollapsed={allDoneCollapsed}
          onToggleDone={toggleAllDone} doneLoading={pedidosPorStatus.FEITO.some((pedido) => loadingId === pedido.id)} />
      </View>
      {alvoCancel ? (
        <ConfirmationLayer onDismiss={() => setAlvoCancel(null)}>
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

const useStyles = createThemedStyles(() => ({
  screen: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x2,
    gap: spacing.x2,
  },
}));
