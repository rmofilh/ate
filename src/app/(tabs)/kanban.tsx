import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { PedidoCard } from '@/presentation/components/PedidoCard';
import { ActionButton } from '@/presentation/components/ActionButton';
import { borderRadius, colors, layout, spacing, textStyles } from '@/constants/theme';
import { uiStyles } from '@/presentation/styles/uiStyles';
import {
  useAuth,
  useAppNavigation,
  useData,
  useNetwork,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface TelaKanbanProps {
  onIniciar?(pedidoId: string): Promise<void>;
  onConcluir?(pedidoId: string): Promise<void>;
  onCancelar?(pedidoId: string): Promise<void>;
  pedidoAlvo?: string;
}

export default function TelaKanban({
  onIniciar,
  onConcluir,
  onCancelar,
}: TelaKanbanProps) {
  const { pedidos, clientes, reload } = useData();
  const { isOnline } = useNetwork();
  const { logout } = useAuth();
  const services = useServices();
  const navigation = useAppNavigation();
  const busyIds = useRef(new Set<string>());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alvoCancel, setAlvoCancel] = useState<string | null>(null);
  const [erroCancel, setErroCancel] = useState<string | null>(null);
  const { width } = useWindowDimensions();

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

  function coluna(status: 'A_FAZER' | 'FAZENDO' | 'FEITO', label: string) {
    const pedidosDaColuna = pedidos.filter((pedido) => pedido.status === status);
    const titulo =
      status === 'A_FAZER' ? 'A Fazer' : status === 'FAZENDO' ? 'Fazendo' : 'Feito';

    return (
      <View testID={label} accessibilityLabel={`Coluna ${titulo}`} style={[styles.column, width >= layout.tabletBreakpoint && styles.tabletColumn]}>
        <Text style={[styles.columnTitle, status === 'FAZENDO' && styles.inProgressTitle]}>{titulo}</Text>
        {pedidosDaColuna.map((pedido) => {
          const cliente = clientes.find((item) => item.id === pedido.clienteId);
          const clienteBalcao =
            cliente?.nome === 'Cliente Avulso' && cliente.contato === '';

          return (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              loading={loadingId === pedido.id}
              onIniciar={() => void iniciar(pedido.id)}
              onConcluir={() => void concluir(pedido.id)}
              onCancelar={() => setAlvoCancel(pedido.id)}
              onEditarPedido={
                pedido.status === 'A_FAZER'
                  ? () => navigation.editarPedido(pedido.id)
                  : undefined
              }
              onEditarCliente={
                cliente && !clienteBalcao
                  ? () => navigation.editarCliente(pedido.clienteId)
                  : undefined
              }
            />
          );
        })}
        {pedidosDaColuna.length === 0 ? (
          <Text style={uiStyles.empty}>Nenhum pedido aqui — toque em Novo Pedido</Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={uiStyles.screen} edges={['bottom', 'left', 'right']}>
    <ScrollView testID="scroll-kanban" contentContainerStyle={uiStyles.scrollContent}>
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityRole="header" style={uiStyles.title}>Meus Pedidos</Text>
      <View style={styles.actions}>
      <ActionButton
        label="novo-pedido"
        title="Novo Pedido"
        onPress={navigation.novoPedido}
        appearance="primary"
        style={styles.newOrder}
      />
      <ActionButton label="botao-sair" title="Sair" onPress={() => void logout()} appearance="quiet" />
      </View>
      {aviso ? <Text testID="aviso-foto-obrigatoria" style={uiStyles.notice}>{aviso}</Text> : null}
      {erroCancel ? <Text testID="erro-cancelar" style={uiStyles.error}>{erroCancel}</Text> : null}
      <View style={[styles.board, width >= layout.tabletBreakpoint && styles.tabletBoard]}>
      {coluna('A_FAZER', 'coluna-a-fazer')}
      {coluna('FAZENDO', 'coluna-fazendo')}
      {coluna('FEITO', 'coluna-feito')}
      </View>
    </ScrollView>
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
  actions: {
    flexDirection: 'row',
    gap: spacing.x3,
    alignItems: 'center',
  },
  newOrder: {
    flex: 1,
  },
  board: {
    gap: spacing.x6,
  },
  tabletBoard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.x4,
  },
  column: {
    gap: spacing.x3,
  },
  tabletColumn: {
    flex: 1,
  },
  columnTitle: {
    ...textStyles.heading,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.control,
    padding: spacing.x3,
  },
  inProgressTitle: {
    backgroundColor: colors.primary,
  },
});
