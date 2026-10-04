import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { borderRadius } from '@/constants/theme';
import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';

// Bundled SVGs bypass the Android decoder that assumes all data: URLs contain Base64.
const brandAssets = {
  light: require('../../../assets/images/fleur-de-lis-light.svg'),
  dark: require('../../../assets/images/fleur-de-lis-dark.svg'),
};

/** Original fleur-de-lis with a pollen-gold detail and platform-compatible cubic paths. */
export function BrandMark({ size = 64 }: { size?: number }) {
  const { colors, scheme } = useDesignTheme();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden style={{ width: size, height: size, borderRadius: borderRadius.card,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={brandAssets[scheme]}
      style={{ width: size * 0.8, height: size * 0.8 }} contentFit="contain" accessible={false} />
  </View>;
}
