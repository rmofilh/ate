import React from 'react';
import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

/** Falha ao abrir ou migrar o banco local: o app não segue sem ele. */
export function TelaErroBanco({ mensagem }: { mensagem: string }) {
  const uiStyles = useUIStyles();
  return (
    <View
      testID="tela-erro-banco"
      style={[uiStyles.screen, { justifyContent: 'center', padding: spacing.x6, gap: spacing.x3 }]}
    >
      <Text accessibilityRole="header" style={uiStyles.title}>Não foi possível abrir seus dados</Text>
      <Text style={uiStyles.error}>{mensagem}</Text>
      <Text style={uiStyles.muted}>Feche e abra o app de novo. Se continuar, reinstale o app.</Text>
    </View>
  );
}
