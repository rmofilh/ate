import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, spacing, textStyles } from '@/constants/theme';
import type { Obra } from '@/core/domain/entities/Obra';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { ActionButton } from './ActionButton';
import { ArtworkThumbnail } from './ArtworkThumbnail';
import { IconButton } from './IconButton';

const availability: Record<Obra['statusObra'], string> = {
  DISPONIVEL: 'Disponível', RESERVADA: 'Reservada', ENTREGUE: 'Entregue', ARQUIVADA: 'Arquivada',
};

export function ObraCard({ obra, onVenda, onAdicionar, onRemoverUnidades, onRemoverObra, loading }: {
  obra: Obra;
  onVenda(): void;
  onAdicionar(): void;
  onRemoverUnidades(): void;
  onRemoverObra(): void;
  loading: boolean;
}) {
  const styles = useStyles();
  return <View testID={`obra-${obra.id}`} style={styles.card}>
    <View style={styles.heading}>
      <ArtworkThumbnail photoPath={obra.fotoPath} />
      <View style={styles.copy}>
        <Text style={styles.name}>{obra.nome}</Text>
        <Text style={styles.type}>{obra.tipo === 'SERIE' ? 'Em série' : 'Peça única'} · {availability[obra.statusObra]}</Text>
        <Text testID={`qtd-${obra.id}`} style={[styles.quantity, obra.quantidade === 0 && styles.empty]}>
          Quantidade: {obra.quantidade}{obra.quantidade === 0 ? ' (Esgotada)' : ''}
        </Text>
      </View>
    </View>
    {obra.tipo === 'SERIE' ? <ActionButton label={`venda-${obra.id}`} title="Venda direta" icon="sale"
      onPress={onVenda} disabled={loading || obra.quantidade === 0} appearance="primary" /> : null}
    <View style={styles.actions}>
      {obra.tipo === 'SERIE' ? <>
        <IconButton label={`add-${obra.id}`} title="Adicionar 1 unidade" icon="plus" onPress={onAdicionar}
          disabled={loading} appearance="secondary" />
        <ActionButton label={`remover-unidades-${obra.id}`} title="Remover unidades" displayTitle="Baixar" icon="minus"
          accessibilityLabel="Baixar unidades do estoque"
          onPress={onRemoverUnidades} disabled={loading || obra.quantidade === 0} appearance="secondary" />
      </> : null}
      <View style={styles.spacer} />
      <IconButton label={`remover-obra-${obra.id}`} title="Remover obra" icon="trash"
        onPress={onRemoverObra} disabled={loading} appearance="danger" />
    </View>
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  card: { padding: spacing.x4, borderRadius: borderRadius.card, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, gap: spacing.x4 },
  heading: { flexDirection: 'row', gap: spacing.x4, alignItems: 'center' },
  copy: { flex: 1, gap: spacing.x1 },
  name: { ...textStyles.heading, color: colors.text },
  type: { ...textStyles.body, fontSize: fontSizes.caption, color: colors.textSecondary },
  quantity: { ...textStyles.label, color: colors.text },
  empty: { color: colors.error },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.x2 },
  spacer: { flex: 1 },
}));
