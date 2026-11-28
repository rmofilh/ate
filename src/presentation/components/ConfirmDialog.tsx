import React from 'react';
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

import { ActionButton } from './ActionButton';

export function ConfirmDialog({
  titulo,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  appearance,
  style,
}: {
  titulo: string;
  onConfirm(): void;
  onCancel(): void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  appearance?: 'panel';
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();

  return (
    <View
      testID="dialog-confirm"
      accessibilityLabel={titulo}
      accessibilityRole="alert"
      style={[appearance === 'panel' && styles.panel, style]}
    >
      <Text style={styles.title}>{titulo}</Text>
      <ActionButton
        label="dialog-cancel"
        title={cancelLabel}
        onPress={onCancel}
        disabled={loading}
        appearance={appearance === 'panel' ? 'secondary' : undefined}
      />
      <ActionButton
        label="dialog-confirm-btn"
        title={loading ? 'Salvando...' : confirmLabel}
        onPress={onConfirm}
        disabled={loading}
        appearance={appearance === 'panel' ? 'danger' : undefined}
      />
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  panel: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    backgroundColor: colors.surface,
    padding: spacing.none,
    gap: spacing.x4,
  },
  title: {
    ...textStyles.heading,
    color: colors.text,
  },
  body: {
    ...textStyles.body,
    color: colors.text,
  },
}));
