import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, TextStyle } from 'react-native';

import { borderRadius, borderWidths, colors, layout, spacing, textStyles } from '@/constants/theme';

type ButtonAppearance = 'primary' | 'secondary' | 'quiet' | 'danger';

export function ActionButton({
  label,
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  appearance,
}: {
  label: string;
  title: string;
  onPress(): void;
  disabled?: boolean;
  style?: PressableProps['style'];
  textStyle?: StyleProp<TextStyle>;
  appearance?: ButtonAppearance;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      testID={label}
      onPress={onPress}
      disabled={disabled}
      style={appearance ? (state) => [
        styles.button,
        styles[appearance],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ] : style}
    >
      <Text style={[
        appearance && styles.text,
        appearance === 'quiet' && styles.quietText,
        appearance === 'danger' && styles.dangerText,
        appearance && disabled && styles.disabledText,
        textStyle,
      ]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.control,
    borderColor: colors.border,
    borderRadius: borderRadius.control,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  quiet: {
    backgroundColor: colors.surface,
    borderWidth: spacing.none,
  },
  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  disabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
  },
  text: {
    ...textStyles.label,
    color: colors.text,
    textAlign: 'center',
  },
  quietText: {
    color: colors.link,
    textDecorationLine: 'underline',
  },
  dangerText: {
    color: colors.error,
  },
  disabledText: {
    color: colors.text,
  },
});
