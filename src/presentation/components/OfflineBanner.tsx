import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, fontSizes, iconSizes, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

import { AppIcon } from './AppIcon';
import { TEXTO_SEM_CONEXAO } from './StatusDaNuvem';

/**
 * Aviso discreto de falta de conexão no topo das telas (RF17). Cor neutra de propósito: o laranja
 * é a cor da coluna "Fazendo" do Kanban. Some sozinho quando a internet volta.
 */
export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  if (isOnline) return null;

  return (
    <View testID="banner-offline" accessibilityLabel="Sem conexão. As alterações ficam salvas no aparelho" style={styles.banner}>
      <AppIcon name="cloudOff" size={iconSizes.small} color={colors.textSecondary} />
      <Text style={styles.text}>{TEXTO_SEM_CONEXAO}</Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  banner: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x1,
    borderRadius: borderRadius.control,
    flexDirection: 'row' as const,
    gap: spacing.x2,
    alignItems: 'center' as const,
  },
  text: {
    ...textStyles.body,
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
}));
