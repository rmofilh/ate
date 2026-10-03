import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

import { ActionButton } from './ActionButton';

export function ConfirmDialog({
  titulo,
  onConfirm,
  onFirstConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requireDouble = false,
  loading = false,
  appearance,
  style,
}: {
  titulo: string;
  onConfirm(): void;
  onFirstConfirm?(): boolean;
  onCancel(): void;
  confirmLabel?: string;
  cancelLabel?: string;
  requireDouble?: boolean;
  loading?: boolean;
  appearance?: 'panel';
  style?: StyleProp<ViewStyle>;
}) {
  const [confirmedOnce, setConfirmedOnce] = useState(false);
  const styles = useStyles();

  return (
    <View
      testID="dialog-confirm"
      accessibilityLabel={titulo}
      accessibilityRole="alert"
      style={[appearance === 'panel' && styles.panel, style]}
    >
      {requireDouble ? <Text accessibilityLiveRegion="polite" style={styles.step}>
        Etapa {confirmedOnce ? '2' : '1'} de 2
      </Text> : null}
      <Text style={styles.title}>{titulo}</Text>
      <ActionButton
        label="dialog-cancel"
        title={cancelLabel}
        onPress={onCancel}
        disabled={loading}
        appearance={appearance === 'panel' ? 'secondary' : undefined}
      />
      {!requireDouble || !confirmedOnce ? (
        <ActionButton
          label="dialog-confirm-btn"
          title={confirmLabel}
          onPress={() => {
            if (requireDouble) {
              if (onFirstConfirm && !onFirstConfirm()) return;
              setConfirmedOnce(true);
            }
            else onConfirm();
          }}
          disabled={loading}
          appearance={appearance === 'panel' ? 'danger' : undefined}
        />
      ) : (
        <>
          <Text style={appearance === 'panel' && styles.body}>Confirme novamente para fazer a baixa definitiva.</Text>
          <ActionButton
            label="dialog-confirm-dupla"
            title={loading ? 'Salvando...' : 'Confirmar de novo (baixa definitiva)'}
            onPress={onConfirm}
            disabled={loading}
            appearance={appearance === 'panel' ? 'danger' : undefined}
          />
        </>
      )}
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
  step: { ...textStyles.label, color: colors.error },
}));
