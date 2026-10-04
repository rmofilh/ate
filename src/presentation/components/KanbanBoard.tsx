import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import type { ListRenderItem } from 'react-native';

import { borderRadius, fontSizes, layout, spacing, textStyles } from '@/constants/theme';
import type { Pedido } from '@/core/domain/entities/Pedido';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useReducedMotion } from '@/presentation/hooks/useReducedMotion';
import { kanbanStages, stagePresentation, type KanbanStage } from '@/presentation/utils/kanban';
import { ActionButton } from './ActionButton';
import { AppIcon } from './AppIcon';
import { KanbanOverview } from './KanbanOverview';
import { IconButton } from './IconButton';

export function KanbanBoard({ groups, renderItem, allDoneCollapsed = false, onToggleDone, doneLoading = false }: {
  groups: Record<KanbanStage, Pedido[]>;
  renderItem: ListRenderItem<Pedido>;
  allDoneCollapsed?: boolean;
  onToggleDone?(): void;
  doneLoading?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const [viewport, setViewport] = useState(width - layout.screenPadding * 2);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  const [overview, setOverview] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const minWidth = layout.columnMinWidth * Math.max(1, Math.min(fontScale, 1.6));
  const largeType = fontScale > 1.6;
  const stackedControls = viewport < 600 && !largeType;
  const fits = viewport >= minWidth * 3 + spacing.x3 * 2;
  const columnWidth = fits ? (viewport - spacing.x3 * 2) / 3
    : Math.min(viewport, Math.max(minWidth, Math.min(viewport * 0.86, 400)));
  const stride = columnWidth + spacing.x3;
  const sidePadding = fits ? 0 : Math.max(0, (viewport - columnWidth) / 2);

  const center = useCallback((index: number, animated: boolean) => {
    scroller.current?.scrollTo({ x: fits ? 0 : index * stride, animated });
  }, [fits, stride]);
  useEffect(() => { center(activeRef.current, false); }, [center, overview]);

  function select(stage: KanbanStage) {
    const index = kanbanStages.indexOf(stage);
    activeRef.current = index;
    setActive(index);
    setOverview(false);
    center(index, !reducedMotion);
  }

  function column(stage: KanbanStage) {
    const meta = stagePresentation[stage];
    return <View testID={meta.testID} accessibilityLabel={`Coluna ${meta.title}, ${groups[stage].length} pedidos`}
      style={[styles.column, { width: columnWidth, backgroundColor: colors[meta.surface], borderColor: colors[meta.color] }]}>
      <View style={[styles.header, { borderBottomColor: colors[meta.color] }]}>
        <AppIcon name={meta.icon} color={colors[meta.color]} />
        <Text accessibilityRole="header" accessibilityLabel={`${meta.title}, ${groups[stage].length} ${groups[stage].length === 1 ? 'pedido' : 'pedidos'}`}
          style={[styles.title, { color: colors[meta.color] }]}>{meta.title}</Text>
        <Text accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden
          style={[styles.count, { color: colors[meta.color] }]}>{groups[stage].length}</Text>
        {stage === 'FEITO' && groups.FEITO.length > 0 && onToggleDone ? <IconButton label="alternar-detalhes-feito"
          title={allDoneCollapsed ? 'Expandir todos os pedidos concluídos' : 'Recolher todos os pedidos concluídos'}
          icon={allDoneCollapsed ? 'expand' : 'collapse'} expanded={!allDoneCollapsed} appearance="quiet"
          tone="done" onPress={onToggleDone} disabled={doneLoading} /> : null}
      </View>
      <FlatList data={groups[stage]} keyExtractor={(pedido) => pedido.id} renderItem={renderItem}
        nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.items}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum pedido aqui — toque em Novo Pedido</Text>} />
    </View>;
  }

  return <View testID="kanban-quadro" style={styles.root} onLayout={(event) => setViewport(event.nativeEvent.layout.width)}>
    <View testID="kanban-controles" style={[styles.controls, stackedControls && styles.stacked]}>
      <View testID="kanban-ancoras" style={[styles.anchors, !stackedControls && styles.inlineAnchors]}>
        {kanbanStages.map((stage, index) => <ActionButton key={stage} label={`ancora-${stage}`}
          title={`Ver ${stagePresentation[stage].title}, ${groups[stage].length} pedidos`}
          displayTitle={largeType ? `${groups[stage].length}` : `${stagePresentation[stage].title} · ${groups[stage].length}`}
          icon={largeType ? stagePresentation[stage].icon : undefined}
          textStyle={largeType ? styles.largeTypeCount : undefined}
          selected={!overview && active === index} appearance="secondary" style={styles.anchor}
          tone={stagePresentation[stage].color}
          onPress={() => select(stage)} />)}
      </View>
      <View style={styles.modeControls}>
        {stackedControls ? <Text style={styles.sortHint}>Por entrega</Text> : null}
        <ActionButton label="alternar-visao-kanban" title={overview ? 'Ver quadro detalhado' : 'Ver visão geral'}
          displayTitle={overview ? 'Quadro detalhado' : 'Visão geral'} icon={overview ? 'board' : 'overview'}
          iconOnly={largeType} appearance="quiet" expanded={overview} onPress={() => setOverview((current) => !current)} />
      </View>
    </View>
    {overview ? <KanbanOverview groups={groups} onSelect={select} /> : <ScrollView ref={scroller}
      testID="quadro-deslizante" horizontal style={styles.scroller} scrollEnabled={!fits}
      showsHorizontalScrollIndicator={false} snapToInterval={fits ? undefined : stride} decelerationRate="fast"
      disableIntervalMomentum contentContainerStyle={[styles.board, { paddingHorizontal: sidePadding }]}
      onContentSizeChange={() => center(activeRef.current, false)} scrollEventThrottle={16}
      onScroll={(event) => {
        if (fits) return;
        const index = Math.max(0, Math.min(2, Math.round(event.nativeEvent.contentOffset.x / stride)));
        activeRef.current = index;
        setActive(index);
      }}>
      <View testID="linha-superior" style={styles.group}>{column('A_FAZER')}{column('FAZENDO')}</View>
      <View testID="linha-inferior" style={styles.group}>{column('FEITO')}</View>
    </ScrollView>}
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, minHeight: 0, gap: spacing.x3 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2, flexShrink: 0 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  // In a column with intrinsic height, flex: 1 would collapse the anchors' measured height.
  anchors: { flexDirection: 'row', gap: spacing.x2, minHeight: layout.minTouchTarget, flexShrink: 0 },
  inlineAnchors: { flex: 1 },
  modeControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2, flexShrink: 0 },
  sortHint: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, flex: 1 },
  anchor: { flex: 1, paddingHorizontal: spacing.x1 },
  largeTypeCount: { fontSize: fontSizes.caption },
  scroller: { flex: 1, minHeight: 0 },
  board: { flexDirection: 'row', gap: spacing.x3, alignItems: 'stretch' },
  group: { flexDirection: 'row', gap: spacing.x3 },
  column: { borderRadius: borderRadius.card, borderWidth: 1,
    padding: spacing.x2, gap: spacing.x3 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.x3,
    gap: spacing.x2, borderBottomWidth: 1 },
  title: { ...textStyles.label, flex: 1 },
  count: { ...textStyles.label },
  list: { flex: 1, minHeight: 0 },
  items: { gap: spacing.x3, paddingBottom: spacing.x2 },
  empty: { ...textStyles.body, color: colors.textSecondary, padding: spacing.x3 },
}));
