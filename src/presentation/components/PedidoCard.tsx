import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, borderWidths, colors, spacing, textStyles } from '@/constants/theme';

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
    <View testID={`pedido-${pedido.id}`} style={styles.card}>
      <Text style={styles.description}>{pedido.descricao}</Text>
      {pedido.status === 'A_FAZER' ? (
        <>
          <ActionButton
            label={`editar-pedido-${pedido.id}`}
            title="Editar pedido"
            onPress={onEditarPedido ?? (() => {})}
            disabled={loading || !onEditarPedido}
            appearance="secondary"
          />
          <ActionButton
            label={`mover-${pedido.id}-fazendo`}
            title={loading ? 'Salvando...' : 'Começar a fazer'}
            onPress={onIniciar}
            disabled={loading}
            appearance="primary"
          />
        </>
      ) : null}
      {onEditarCliente ? (
        <ActionButton
          label={`editar-cliente-${pedido.id}`}
          title="Editar cliente"
          onPress={onEditarCliente}
          disabled={loading}
          appearance="quiet"
        />
      ) : null}
      {pedido.status === 'FAZENDO' ? (
        <ActionButton
          label={`mover-${pedido.id}-feito`}
          title={loading ? 'Salvando...' : 'Mover para Feito (tirar foto)'}
          onPress={onConcluir}
          disabled={loading}
          appearance="primary"
        />
      ) : null}
      <ActionButton
        label={`cancelar-${pedido.id}`}
        title="Cancelar pedido"
        onPress={onCancelar}
        disabled={loading}
        appearance="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.x4,
    gap: spacing.x2,
  },
  description: {
    ...textStyles.heading,
    color: colors.text,
    marginBottom: spacing.x2,
  },
});
