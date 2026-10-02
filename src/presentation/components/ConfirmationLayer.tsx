import React, { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/constants/theme';

export function ConfirmationLayer({ children }: PropsWithChildren) {
  return (
    <View style={styles.layer} pointerEvents="box-none">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: spacing.x6,
    bottom: spacing.x6,
    left: layout.screenPadding,
    right: layout.screenPadding,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scroll: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    maxHeight: '100%',
    flexGrow: spacing.none,
    flexShrink: 1,
  },
  content: {
    alignItems: 'center',
    gap: spacing.x4,
  },
});
