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

export function EventoCard({ evento, onEditar, onRemover, onVerNoMapa, loading, realizado = false }: {
  evento: Evento;
  onEditar(): void;
  onRemover(): void;
  onVerNoMapa(): void;
  loading: boolean;
  realizado?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  return <View testID={`evento-${evento.id}`} style={styles.card}>
    <View style={styles.heading}>
      <View accessible={false} style={[styles.dateTile, realizado && styles.dateTilePast]}>
        <Text style={[styles.day, realizado && styles.datePast]}>{evento.data.getUTCDate()}</Text>
        <Text style={[styles.month, realizado && styles.datePast]}>{months[evento.data.getUTCMonth()]}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{evento.nome}</Text>
        <Text style={styles.date}>{formatCalendarDate(evento.data)}</Text>
        {realizado ? <Text testID={`realizado-${evento.id}`} style={styles.past}>Realizado</Text> : null}
      </View>
    </View>
    <View style={styles.address}>
      <AppIcon name="pin" color={colors.textSecondary} />
      <Text style={styles.addressText}>{evento.endereco}</Text>
    </View>
    {evento.observacoes ? <Text style={styles.notes}>{evento.observacoes}</Text> : null}
    <View style={styles.actions}>
      <ActionButton label={`editar-evento-${evento.id}`} title="Editar evento" displayTitle="Editar" icon="edit"
        onPress={onEditar} disabled={loading} appearance="secondary" />
      <ActionButton label={`ver-mapa-${evento.id}`} title="Ver no mapa" icon="pin"
        onPress={onVerNoMapa} disabled={loading} appearance="secondary" />
      <View style={styles.spacer} />
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
  dateTilePast: { backgroundColor: colors.surfaceSecondary },
  day: { ...textStyles.brand, color: colors.onSelection },
  month: { ...textStyles.label, fontSize: fontSizes.caption, color: colors.onSelection },
  datePast: { color: colors.textSecondary },
  copy: { flex: 1, gap: spacing.x1 },
  name: { ...textStyles.heading, color: colors.text },
  date: { ...textStyles.body, color: colors.textSecondary },
  past: { ...textStyles.label, fontSize: fontSizes.caption, color: colors.textSecondary },
  address: { flexDirection: 'row', gap: spacing.x2, alignItems: 'center' },
  addressText: { ...textStyles.body, color: colors.text, flex: 1 },
  notes: { ...textStyles.body, color: colors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.x2 },
  spacer: { flex: 1 },
}));
