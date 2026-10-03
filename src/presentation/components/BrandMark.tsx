import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { borderRadius } from '@/constants/theme';
import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';

/** Original, single-colour fleur-de-lis. Cubic paths work in the iOS SVG decoder. */
export function BrandMark({ size = 64 }: { size?: number }) {
  const { colors } = useDesignTheme();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${colors.onPrimary}" d="M50 10C39 23 35 33 39 44L45 60H55L61 44C65 33 61 23 50 10ZM44 59C38 44 26 31 16 37C3 45 15 64 31 62C24 59 19 53 22 49C27 43 35 51 38 59ZM56 59C62 44 74 31 84 37C97 45 85 64 69 62C76 59 81 53 78 49C73 43 65 51 62 59ZM44 75C43 80 37 85 32 87C42 90 47 86 50 80C53 86 58 90 68 87C63 85 57 80 56 75Z"/><path fill="${colors.accent}" d="M31 64H69V71H31Z"/></svg>`;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden style={{ width: size, height: size, borderRadius: borderRadius.card,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
      style={{ width: size * 0.8, height: size * 0.8 }} contentFit="contain" accessible={false} />
  </View>;
}
