import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, spacing, textStyles } from '@/constants/theme';
import { useData } from '@/presentation/hooks/AppProviders';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

/** Mostra a falha de leitura dos dados locais em vez de escondê-la. */
export function ErroDadosBanner() {
  const styles = useStyles();
  const { erro } = useData();
  if (!erro) return null;

  return (
    <View testID="banner-erro-dados" accessibilityLiveRegion="polite" style={styles.banner}>
      <Text style={styles.text}>Não foi possível carregar seus dados: {erro}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  banner: {
    backgroundColor: colors.errorSurface,
    padding: spacing.x3,
    borderRadius: borderRadius.control,
  },
  text: {
    ...textStyles.body,
    color: colors.error,
  },
}));
