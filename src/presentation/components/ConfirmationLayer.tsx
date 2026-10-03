import React, { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { borderRadius, layout, spacing } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { IconButton } from './IconButton';

export function ConfirmationLayer({ children, onDismiss, busy = false }: PropsWithChildren<{
  onDismiss?(): void;
  busy?: boolean;
}>) {
  const styles = useStyles();
  return (
    <Modal testID="confirmation-modal" transparent visible animationType="none" supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => { if (!busy) onDismiss?.(); }}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.layer} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.avoiding} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View accessibilityViewIsModal style={styles.panel}>
              {onDismiss ? <View style={styles.close}><IconButton label="fechar-confirmacao" title="Fechar diálogo"
                icon="close" onPress={onDismiss} disabled={busy} appearance="quiet" /></View> : null}
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = createThemedStyles((colors) => ({
  layer: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  avoiding: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    width: '100%',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    padding: layout.screenPadding,
  },
  panel: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.x4,
    gap: spacing.x4,
  },
  close: { alignSelf: 'flex-end' },
}));
