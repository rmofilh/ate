import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderWidths, colors, spacing, textStyles } from '@/constants/theme';

import type { Evento } from '../../core/domain/entities/Evento';
import { formatCalendarDate } from '../utils/date';
import { ActionButton } from './ActionButton';

export function EventoCard({
  evento,
  onEditar,
  onRemover,
  loading,
}: {
  evento: Evento;
  onEditar(): void;
  onRemover(): void;
  loading: boolean;
}) {
  return (
    <View testID={`evento-${evento.id}`} style={styles.row}>
      <Text style={styles.description}>
        {evento.nome} - {formatCalendarDate(evento.data)} - {evento.endereco}
      </Text>
      <Text testID={`pin-${evento.id}`} style={styles.location}>
        Pin: {evento.localizacao.latitude}, {evento.localizacao.longitude}
      </Text>
      <ActionButton
        label={`editar-evento-${evento.id}`}
        title="Editar evento"
        onPress={onEditar}
        disabled={loading}
        appearance="secondary"
      />
      <ActionButton
        label={`remover-${evento.id}`}
        title={loading ? 'Removendo...' : 'Remover evento'}
        onPress={onRemover}
        disabled={loading}
        appearance="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.x3,
    paddingBottom: spacing.x6,
    borderBottomWidth: borderWidths.control,
    borderBottomColor: colors.border,
  },
  description: {
    ...textStyles.heading,
    color: colors.text,
  },
  location: {
    ...textStyles.body,
    color: colors.focus,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.x3,
  },
});
