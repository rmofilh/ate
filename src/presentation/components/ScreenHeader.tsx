import { useNavigation } from 'expo-router';
import React from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { spacing, textStyles } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { ActionButton } from './ActionButton';
import { IconButton } from './IconButton';

function useDrawerMenu() {
  let navigation: { openDrawer?: () => void } | null = null;
  try {
    // Screens are also tested without a navigator. This hook is called on every render.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigation = useNavigation() as unknown as { openDrawer?: () => void };
  } catch { /* Isolated presentation. */ }
  return () => navigation?.openDrawer?.();
}

export function ScreenHeader({ title, action, children }: React.PropsWithChildren<{
  title: string;
  action?: { testID: string; title: string; displayTitle?: string; onPress(): void };
}>) {
  const styles = useStyles();
  const openMenu = useDrawerMenu();
  const { width, fontScale } = useWindowDimensions();
  const compactAction = width < 600 && fontScale > 1.5;
  return <View style={styles.header}>
    <IconButton label="botao-menu" title="Abrir menu" icon="menu" onPress={openMenu} appearance="quiet" />
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {action ? <ActionButton label={action.testID} title={action.title} displayTitle={action.displayTitle ?? 'Novo'} icon="plus"
      iconOnly={compactAction} onPress={action.onPress} appearance="primary" /> : null}
    {children}
  </View>;
}

const useStyles = createThemedStyles((colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  title: { ...textStyles.heading, color: colors.text, flex: 1, flexShrink: 1 },
}));
