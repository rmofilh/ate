import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

/** Exibida enquanto o banco local aplica as migrations. */
export function TelaCarregando() {
  const uiStyles = useUIStyles();
  const { colors } = useDesignTheme();
  return (
    <View testID="tela-carregando" style={[uiStyles.screen, { justifyContent: 'center' }]}>
      <ActivityIndicator accessibilityLabel="Carregando dados" color={colors.text} />
    </View>
  );
}
