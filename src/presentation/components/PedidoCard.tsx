import React from 'react';
import { Text, View } from 'react-native';

import type { Pedido } from '../../core/domain/entities/Pedido';
import { ActionButton } from './ActionButton';

export function PedidoCard({
  pedido,
  onIniciar,
  onConcluir,
  onCancelar,
  onEditarPedido,
  onEditarCliente,
  loading,
}: {
  pedido: Pedido;
  onIniciar(): void;
  onConcluir(): void;
  onCancelar(): void;
  onEditarPedido?(): void;
  onEditarCliente?(): void;
  loading: boolean;
}) {
  return (
    <View testID={`pedido-${pedido.id}`}>
      <Text>{pedido.descricao}</Text>
      {pedido.status === 'A_FAZER' ? (
        <>
          <ActionButton
            label={`editar-pedido-${pedido.id}`}
            title="Editar pedido"
            onPress={onEditarPedido ?? (() => {})}
            disabled={loading || !onEditarPedido}
          />
          <ActionButton
            label={`mover-${pedido.id}-fazendo`}
            title={loading ? 'Salvando...' : 'Começar a fazer'}
            onPress={onIniciar}
            disabled={loading}
          />
        </>
      ) : null}
      {onEditarCliente ? (
        <ActionButton
          label={`editar-cliente-${pedido.id}`}
          title="Editar cliente"
          onPress={onEditarCliente}
          disabled={loading}
        />
      ) : null}
      {pedido.status === 'FAZENDO' ? (
        <ActionButton
          label={`mover-${pedido.id}-feito`}
          title={loading ? 'Salvando...' : 'Mover para Feito (tirar foto)'}
          onPress={onConcluir}
          disabled={loading}
        />
      ) : null}
      <ActionButton
        label={`cancelar-${pedido.id}`}
        title="Cancelar pedido"
        onPress={onCancelar}
        disabled={loading}
      />
    </View>
  );
}
