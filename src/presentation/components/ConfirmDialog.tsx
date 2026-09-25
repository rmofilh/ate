import React, { useState } from 'react';
import { Text, View } from 'react-native';

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
}: {
  titulo: string;
  onConfirm(): void;
  onFirstConfirm?(): boolean;
  onCancel(): void;
  confirmLabel?: string;
  cancelLabel?: string;
  requireDouble?: boolean;
  loading?: boolean;
}) {
  const [confirmedOnce, setConfirmedOnce] = useState(false);

  return (
    <View
      testID="dialog-confirm"
      accessibilityLabel={titulo}
      accessibilityRole="alert"
    >
      <Text>{titulo}</Text>
      <ActionButton
        label="dialog-cancel"
        title={cancelLabel}
        onPress={onCancel}
        disabled={loading}
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
        />
      ) : (
        <>
          <Text>Confirme novamente para fazer a baixa definitiva.</Text>
          <ActionButton
            label="dialog-confirm-dupla"
            title={loading ? 'Salvando...' : 'Confirmar de novo (baixa definitiva)'}
            onPress={onConfirm}
            disabled={loading}
          />
        </>
      )}
    </View>
  );
}
