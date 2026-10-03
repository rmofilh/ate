import { StyleSheet, useColorScheme } from 'react-native';

import { colors, darkColors, type ThemeColors } from '@/constants/theme';

export function useDesignTheme() {
  const scheme: 'dark' | 'light' = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: scheme === 'dark' ? darkColors : colors };
}

/** Two cached stylesheets; only presentation subscribes to system appearance. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (palette: ThemeColors) => T,
) {
  const themes = {
    light: StyleSheet.create(factory(colors)),
    dark: StyleSheet.create(factory(darkColors)),
  };
  return function useStyles() {
    return themes[useDesignTheme().scheme];
  };
}
