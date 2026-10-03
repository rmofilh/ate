import React, { type PropsWithChildren, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

export function FormScreen({ children, testID, auth = false }: PropsWithChildren<{
  testID?: string;
  auth?: boolean;
}>) {
  const styles = useStyles();
  const container = useRef<View>(null);
  const [offset, setOffset] = useState(0);
  return (
    <SafeAreaView style={styles.screen} edges={auth ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}>
      <View ref={container} style={styles.screen} onLayout={() => {
        // Includes the actual Stack header / safe area, even after rotation.
        container.current?.measureInWindow((_x, y) => setOffset(y));
      }}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'web' ? undefined : 'padding'}
          keyboardVerticalOffset={offset}>
          <ScrollView testID={testID} style={styles.screen} contentContainerStyle={[styles.content, auth && styles.auth]}
            keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={false}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: layout.screenPadding, paddingVertical: spacing.x6 },
  auth: { justifyContent: 'center' },
}));
