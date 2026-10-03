import React from 'react';
import { Text, View } from 'react-native';

import { borderRadius, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { AppIcon } from './AppIcon';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  if (isOnline) return null;

  return (
    <View testID="banner-offline" accessibilityLabel="Você está offline" style={styles.banner}>
      <AppIcon name="offline" color={colors.doing} />
      <Text style={styles.text}>Você está offline</Text>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  banner: {
    backgroundColor: colors.doingSurface,
    padding: spacing.x3,
    borderRadius: borderRadius.control,
    flexDirection: 'row',
    gap: spacing.x2,
    alignItems: 'center',
  },
  text: {
    ...textStyles.body,
    color: colors.doing,
    flexShrink: 1,
  },
}));
