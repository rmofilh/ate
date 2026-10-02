import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, textStyles } from '@/constants/theme';

import type { Obra } from '../../core/domain/entities/Obra';
import { ActionButton } from './ActionButton';

export function ObraCard({
  obra,
  onVenda,
  onAdicionar,
  onRemoverUnidades,
  onRemoverObra,
  loading,
}: {
  obra: Obra;
  onVenda(): void;
  onAdicionar(): void;
  onRemoverUnidades(): void;
  onRemoverObra(): void;
  loading: boolean;
}) {
  return (
    <View testID={`obra-${obra.id}`} style={styles.row}>
      <Text style={styles.name}>
        {obra.nome} ({obra.tipo})
      </Text>
      <Text testID={`qtd-${obra.id}`} style={styles.quantity}>
        Quantidade: {obra.quantidade}
        {obra.quantidade === 0 ? ' (Esgotada)' : ''}
      </Text>
      {obra.tipo === 'SERIE' ? (
        <>
          <ActionButton
            label={`venda-${obra.id}`}
            title="Venda direta"
            onPress={onVenda}
            disabled={loading || obra.quantidade === 0}
            appearance="primary"
          />
          <ActionButton
            label={`add-${obra.id}`}
            title="Adicionar 1 unidade"
            onPress={onAdicionar}
            disabled={loading}
            appearance="secondary"
          />
          <ActionButton
            label={`remover-unidades-${obra.id}`}
            title="Remover unidades"
            onPress={onRemoverUnidades}
            disabled={loading || obra.quantidade === 0}
            appearance="danger"
          />
        </>
      ) : null}
      <ActionButton
        label={`remover-obra-${obra.id}`}
        title="Remover obra"
        onPress={onRemoverObra}
        disabled={loading}
        appearance="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.x4,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.x3,
  },
  name: {
    ...textStyles.heading,
    color: colors.text,
  },
  quantity: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.x2,
  },
});
