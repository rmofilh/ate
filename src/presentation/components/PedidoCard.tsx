import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import type { Pedido } from '@/core/domain/entities/Pedido';
import type { TipoObra } from '@/core/domain/enums/TipoObra';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { formatCalendarDate } from '@/presentation/utils/date';
import { channelLabels } from '@/presentation/utils/labels';
import { stagePresentation } from '@/presentation/utils/kanban';
import { getControlTone } from '@/presentation/styles/controlTone';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { IconButton } from './IconButton';

export function PedidoCard({ pedido, onIniciar, onConcluir, onCancelar, onEditarPedido,
  onEditarCliente, loading, compact = false, clienteNome, obraNome, obraTipo, collapsed = false, onToggleCollapsed }: {
  pedido: Pedido;
  onIniciar(): void;
  onConcluir(): void;
  onCancelar(): void;
  onEditarPedido?(): void;
  onEditarCliente?(): void;
  loading: boolean;
  compact?: boolean;
  clienteNome?: string;
  obraNome?: string;
  obraTipo?: TipoObra;
  collapsed?: boolean;
  onToggleCollapsed?(): void;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const tone = stagePresentation[pedido.status].color;
  const context = getControlTone(colors, tone);
  const collapsible = pedido.status === 'FEITO' && !!onToggleCollapsed;
  const isCollapsed = collapsible && collapsed;
  const heading = isCollapsed ? obraNome ?? pedido.descricao : pedido.descricao;
  return <View testID={`pedido-${pedido.id}`} style={[styles.card, compact && styles.compact, isCollapsed && styles.collapsed]}>
    {collapsible ? <ActionButton label={`detalhes-feito-${pedido.id}`}
      title={`${isCollapsed ? 'Expandir' : 'Recolher'} detalhes de ${heading}`} displayTitle={heading}
      icon={isCollapsed ? 'expand' : 'collapse'} appearance="quiet" expanded={!isCollapsed} disabled={loading}
      tone={tone}
      onPress={() => onToggleCollapsed?.()} style={({ pressed }) => [styles.disclosure,
        pressed && { backgroundColor: context.surface }]} textStyle={styles.description} />
      : <Text style={styles.description}>{pedido.descricao}</Text>}
    {!isCollapsed ? <>
    {clienteNome ? <Text style={styles.client}>{clienteNome}</Text> : null}
    {pedido.obraId ? <View testID={`vinculo-obra-${pedido.id}`} style={[styles.linkedWork, { backgroundColor: context.surface }]}>
      <AppIcon name="stock" size={iconSizes.small} color={context.foreground} />
      <View style={styles.workCopy}>
        <Text style={[styles.workLabel, { color: context.foreground }]}>Obra vinculada</Text>
        <Text style={styles.workName}>{obraNome ?? 'Obra do estoque'}</Text>
        <Text style={styles.metaText}>
          {obraTipo ? `${obraTipo === 'SERIE' ? 'Em série' : 'Peça única'} · ` : ''}
          {pedido.quantidadeObra} {pedido.quantidadeObra === 1 ? 'unidade' : 'unidades'}
        </Text>
      </View>
    </View> : null}
    <View style={styles.tags}>
      <View style={styles.metadata}>
        <AppIcon name="calendar" size={iconSizes.small} color={context.foreground} />
        <Text style={styles.metaText}>{formatCalendarDate(pedido.dataEntrega)}</Text>
      </View>
      <Text style={[styles.tag, { color: context.foreground, backgroundColor: context.surface }]}>{channelLabels[pedido.canalOrigem]}</Text>
      {pedido.vendaDireta ? <Text style={[styles.tag, { color: context.foreground, backgroundColor: context.surface }]}>Venda direta</Text> : null}
    </View>
    {pedido.status === 'A_FAZER' ? <ActionButton label={`mover-${pedido.id}-fazendo`}
      title={loading ? 'Salvando...' : 'Começar a fazer'} displayTitle={loading ? undefined : 'Iniciar'}
      accessibilityLabel={loading ? 'Salvando...' : 'Iniciar produção'}
      icon="forward" onPress={onIniciar} disabled={loading} busy={loading} appearance="primary" tone={tone} /> : null}
    {pedido.status === 'FAZENDO' ? <ActionButton label={`mover-${pedido.id}-feito`}
      title={loading ? 'Salvando...' : 'Mover para Feito (tirar foto)'} displayTitle={loading ? undefined : 'Concluir com foto'}
      accessibilityLabel={loading ? 'Salvando...' : 'Concluir com foto. Foto obrigatória para mover para Feito.'}
      icon="camera" onPress={onConcluir} disabled={loading} busy={loading} appearance="primary" tone={tone} /> : null}
    <View style={styles.actions}>
      {pedido.status === 'A_FAZER' ? <IconButton label={`editar-pedido-${pedido.id}`} title="Editar pedido"
        icon="edit" onPress={onEditarPedido ?? (() => {})} disabled={loading || !onEditarPedido} appearance="quiet" tone={tone} /> : null}
      {onEditarCliente ? <IconButton label={`editar-cliente-${pedido.id}`} title="Editar cliente" icon="person"
        onPress={onEditarCliente} disabled={loading} appearance="quiet" tone={tone} /> : null}
      <View style={styles.spacer} />
      <IconButton label={`cancelar-${pedido.id}`} title="Cancelar pedido" icon="close"
        onPress={onCancelar} disabled={loading} appearance="danger" />
    </View>
    </> : null}
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.card, padding: spacing.x4, gap: spacing.x3 },
  compact: { padding: spacing.x3 },
  collapsed: { paddingVertical: spacing.x2 },
  disclosure: { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent', justifyContent: 'flex-start' },
  description: { ...textStyles.heading, fontSize: fontSizes.cardHeading, color: colors.text, textAlign: 'left' },
  client: { ...textStyles.body, color: colors.textSecondary },
  linkedWork: { flexDirection: 'row', gap: spacing.x2, padding: spacing.x3, borderRadius: borderRadius.control },
  workCopy: { flex: 1, gap: spacing.x1 },
  workLabel: { ...textStyles.body, fontSize: fontSizes.caption },
  workName: { ...textStyles.label, color: colors.text },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  metaText: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.x2 },
  tag: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.pill, paddingHorizontal: spacing.x2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  spacer: { flex: 1 },
}));
