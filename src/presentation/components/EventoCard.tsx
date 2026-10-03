import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, spacing, textStyles } from '@/constants/theme';
import type { Evento } from '@/core/domain/entities/Evento';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { formatCalendarDate } from '@/presentation/utils/date';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function EventoCard({ evento, onEditar, onRemover, loading }: {
  evento: Evento;
  onEditar(): void;
  onRemover(): void;
  loading: boolean;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  return <View testID={`evento-${evento.id}`} style={styles.card}>
    <View style={styles.heading}>
      <View accessible={false} style={styles.dateTile}>
        <Text style={styles.day}>{evento.data.getUTCDate()}</Text>
        <Text style={styles.month}>{months[evento.data.getUTCMonth()]}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{evento.nome}</Text>
        <Text style={styles.date}>{formatCalendarDate(evento.data)}</Text>
      </View>
    </View>
    <View style={styles.address}>
      <AppIcon name="pin" color={colors.textSecondary} />
      <Text style={styles.addressText}>{evento.endereco}</Text>
    </View>
    {evento.observacoes ? <Text style={styles.notes}>{evento.observacoes}</Text> : null}
    <Text testID={`pin-${evento.id}`} style={styles.coordinates}>
      Pin: {evento.localizacao.latitude}, {evento.localizacao.longitude}
    </Text>
    <View style={styles.actions}>
      <ActionButton label={`editar-evento-${evento.id}`} title="Editar evento" displayTitle="Editar" icon="edit"
        onPress={onEditar} disabled={loading} appearance="secondary" />
      <IconButton label={`remover-${evento.id}`} title={loading ? 'Removendo...' : 'Remover evento'} icon="trash"
        onPress={onRemover} disabled={loading} appearance="danger" />
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  card: { backgroundColor: colors.surface, padding: spacing.x4, gap: spacing.x4,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.card },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.x4 },
  dateTile: { backgroundColor: colors.selection, borderRadius: borderRadius.control, padding: spacing.x3,
    minWidth: 72, alignItems: 'center' },
  day: { ...textStyles.brand, color: colors.onSelection },
  month: { ...textStyles.label, fontSize: fontSizes.caption, color: colors.onSelection },
  copy: { flex: 1, gap: spacing.x1 },
  name: { ...textStyles.heading, color: colors.text },
  date: { ...textStyles.body, color: colors.textSecondary },
  address: { flexDirection: 'row', gap: spacing.x2, alignItems: 'center' },
  addressText: { ...textStyles.body, color: colors.text, flex: 1 },
  notes: { ...textStyles.body, color: colors.textSecondary },
  coordinates: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.x2 },
}));
