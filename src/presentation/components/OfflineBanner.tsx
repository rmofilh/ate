import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, textStyles } from '@/constants/theme';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;

  return (
    <View testID="banner-offline" accessibilityLabel="Você está offline" style={styles.banner}>
      <Text style={styles.text}>Você está offline - ações serão salvas no aparelho</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.x3,
  },
  text: {
    ...textStyles.body,
    color: colors.text,
  },
});
