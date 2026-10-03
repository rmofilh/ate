import React from 'react';
import { FlatList, Text, View } from 'react-native';

import { borderRadius, fontSizes, spacing, textStyles } from '@/constants/theme';
import type { Pedido } from '@/core/domain/entities/Pedido';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { kanbanStages, stagePresentation, type KanbanStage } from '@/presentation/utils/kanban';
import { ActionButton } from './ActionButton';

export function KanbanOverview({ groups, onSelect }: {
  groups: Record<KanbanStage, Pedido[]>;
  onSelect(stage: KanbanStage): void;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  return <View testID="kanban-visao-geral" style={styles.board}>
    {kanbanStages.map((stage) => {
      const meta = stagePresentation[stage];
      return <View key={stage} testID={`resumo-${meta.testID}`} style={[styles.column, { backgroundColor: colors[meta.surface] }]}>
        <ActionButton label={`abrir-resumo-${stage}`} title={`Abrir etapa ${meta.title}`}
          displayTitle={meta.title} onPress={() => onSelect(stage)} appearance="quiet" style={styles.header}
          textStyle={[styles.title, { color: colors[meta.color] }]} />
        <Text style={[styles.count, { color: colors[meta.color] }]}>{groups[stage].length} {groups[stage].length === 1 ? 'pedido' : 'pedidos'}</Text>
        <FlatList data={groups[stage]} keyExtractor={(pedido) => pedido.id} style={styles.list}
          contentContainerStyle={styles.items} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>Sem pedidos</Text>}
          renderItem={({ item }) => <View testID={`resumo-pedido-${item.id}`} style={styles.card}>
            <Text numberOfLines={3} style={styles.description}>{item.descricao}</Text>
          </View>} />
      </View>;
    })}
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  board: { flex: 1, flexDirection: 'row', gap: spacing.x2, minHeight: 0 },
  column: { flex: 1, minWidth: 0, borderRadius: borderRadius.control, padding: spacing.x1, gap: spacing.x2 },
  header: { paddingHorizontal: spacing.x1, backgroundColor: 'transparent' },
  title: { ...textStyles.label, fontSize: fontSizes.caption },
  count: { ...textStyles.body, fontSize: fontSizes.caption, textAlign: 'center' },
  list: { flex: 1, minHeight: 0 },
  items: { gap: spacing.x2, paddingBottom: spacing.x2 },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.control, padding: spacing.x2 },
  description: { ...textStyles.body, fontSize: fontSizes.caption, lineHeight: 20, color: colors.text },
  empty: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary, textAlign: 'center' },
}));
