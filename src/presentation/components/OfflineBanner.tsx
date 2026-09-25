import React from 'react';
import { Text, View } from 'react-native';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;

  return (
    <View testID="banner-offline" accessibilityLabel="Você está offline">
      <Text>Você está offline - ações serão salvas no aparelho</Text>
    </View>
  );
}
