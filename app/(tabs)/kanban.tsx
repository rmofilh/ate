import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';
import { OfflineBanner } from '../../src/presentation/components/OfflineBanner';
import { PedidoCard } from '../../src/presentation/components/PedidoCard';
import { ActionButton } from '../../src/presentation/components/ActionButton';
import {
  useAuth,
  useAppNavigation,
  useData,
  useNetwork,
  useServices,
} from '../../src/presentation/hooks/AppProviders';

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
      <View testID={label} accessibilityLabel={`Coluna ${titulo}`}>
        <Text>{titulo}</Text>
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
          <Text>Nenhum pedido aqui — toque em Novo Pedido</Text>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView testID="scroll-kanban">
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityRole="header">Meus Pedidos</Text>
      <ActionButton
        label="novo-pedido"
        title="Novo Pedido"
        onPress={navigation.novoPedido}
      />
      <ActionButton label="botao-sair" title="Sair" onPress={() => void logout()} />
      {aviso ? <Text testID="aviso-foto-obrigatoria">{aviso}</Text> : null}
      {erroCancel ? <Text testID="erro-cancelar">{erroCancel}</Text> : null}
      {coluna('A_FAZER', 'coluna-a-fazer')}
      {coluna('FAZENDO', 'coluna-fazendo')}
      {coluna('FEITO', 'coluna-feito')}
      {alvoCancel ? (
        <ConfirmDialog
          titulo="Cancelar este pedido? O estoque vinculado será devolvido."
          onCancel={() => setAlvoCancel(null)}
          onConfirm={() => void cancelarConfirmado()}
        />
      ) : null}
    </ScrollView>
  );
}
