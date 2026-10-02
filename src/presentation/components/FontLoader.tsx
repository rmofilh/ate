import { useFonts } from 'expo-font';
import React, { type PropsWithChildren } from 'react';

import { fontFamilies } from '@/constants/theme';

const fontSources = {
  [fontFamilies.brand]: require('../../../assets/fonts/BricolageGrotesque_700Bold.ttf'),
  [fontFamilies.regular]: require('../../../assets/fonts/AtkinsonHyperlegibleNext_400Regular.ttf'),
  [fontFamilies.semibold]: require('../../../assets/fonts/AtkinsonHyperlegibleNext_600SemiBold.ttf'),
  [fontFamilies.bold]: require('../../../assets/fonts/AtkinsonHyperlegibleNext_700Bold.ttf'),
};

export function FontLoader({ children }: PropsWithChildren) {
  const [loaded, error] = useFonts(fontSources);

  if (!loaded && !error) return null;

  return <>{children}</>;
}
