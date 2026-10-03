import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { Pedido } from '@/core/domain/entities/Pedido';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { formatCalendarDate } from '@/presentation/utils/date';
import { channelLabels } from '@/presentation/utils/labels';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

export function PedidoCard({ pedido, onIniciar, onConcluir, onCancelar, onEditarPedido,
  onEditarCliente, loading, compact = false, clienteNome }: {
  pedido: Pedido;
  onIniciar(): void;
  onConcluir(): void;
  onCancelar(): void;
  onEditarPedido?(): void;
  onEditarCliente?(): void;
  loading: boolean;
  compact?: boolean;
  clienteNome?: string;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  return <View testID={`pedido-${pedido.id}`} style={[styles.card, compact && styles.compact]}>
    <Text style={styles.description}>{pedido.descricao}</Text>
    {clienteNome ? <Text style={styles.client}>{clienteNome}</Text> : null}
    <View style={styles.tags}>
      <View style={styles.metadata}>
        <AppIcon name="calendar" size={iconSizes.small} color={colors.textSecondary} />
        <Text style={styles.metaText}>{formatCalendarDate(pedido.dataEntrega)}</Text>
      </View>
      <Text style={styles.tag}>{channelLabels[pedido.canalOrigem]}</Text>
      {pedido.vendaDireta ? <Text style={[styles.tag, styles.saleTag]}>Venda direta</Text> : null}
    </View>
    {pedido.status === 'A_FAZER' ? <ActionButton label={`mover-${pedido.id}-fazendo`}
      title={loading ? 'Salvando...' : 'Começar a fazer'} displayTitle={loading ? undefined : 'Iniciar'}
      accessibilityLabel={loading ? 'Salvando...' : 'Iniciar produção'}
      icon="forward" onPress={onIniciar} disabled={loading} busy={loading} appearance="primary" /> : null}
    {pedido.status === 'FAZENDO' ? <ActionButton label={`mover-${pedido.id}-feito`}
      title={loading ? 'Salvando...' : 'Mover para Feito (tirar foto)'} displayTitle={loading ? undefined : 'Concluir com foto'}
      accessibilityLabel={loading ? 'Salvando...' : 'Concluir com foto. Foto obrigatória para mover para Feito.'}
      icon="camera" onPress={onConcluir} disabled={loading} busy={loading} appearance="primary" /> : null}
    <View style={styles.actions}>
      {pedido.status === 'A_FAZER' ? <IconButton label={`editar-pedido-${pedido.id}`} title="Editar pedido"
        icon="edit" onPress={onEditarPedido ?? (() => {})} disabled={loading || !onEditarPedido} appearance="quiet" /> : null}
      {onEditarCliente ? <IconButton label={`editar-cliente-${pedido.id}`} title="Editar cliente" icon="person"
        onPress={onEditarCliente} disabled={loading} appearance="quiet" /> : null}
      <View style={styles.spacer} />
      <IconButton label={`cancelar-${pedido.id}`} title="Cancelar pedido" icon="close"
        onPress={onCancelar} disabled={loading} appearance="danger" />
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.card, padding: spacing.x4, gap: spacing.x3 },
  compact: { padding: spacing.x3 },
  description: { ...textStyles.heading, fontSize: fontSizes.cardHeading, color: colors.text },
  client: { ...textStyles.body, color: colors.textSecondary },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  metaText: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.x2 },
  tag: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.pill, paddingHorizontal: spacing.x2 },
  saleTag: { color: colors.done, backgroundColor: colors.doneSurface },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  spacer: { flex: 1 },
}));
