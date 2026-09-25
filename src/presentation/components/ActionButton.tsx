import React from 'react';
import { Pressable, Text } from 'react-native';

export function ActionButton({
  label,
  title,
  onPress,
  disabled = false,
}: {
  label: string;
  title: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      testID={label}
      onPress={onPress}
      disabled={disabled}
    >
      <Text>{title}</Text>
    </Pressable>
  );
}
