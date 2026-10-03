import React from 'react';
import { Pressable, Text } from 'react-native';
import type { PressableProps, StyleProp, TextStyle } from 'react-native';

import { borderRadius, borderWidths, layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { AppIcon, type IconName } from './AppIcon';

type ButtonAppearance = 'primary' | 'secondary' | 'quiet' | 'danger';

export function ActionButton({
  label,
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  appearance,
  icon,
  displayTitle,
  iconOnly = false,
  selected,
  busy = false,
  expanded,
  accessibilityLabel,
}: {
  label: string;
  title: string;
  onPress(): void;
  disabled?: boolean;
  style?: PressableProps['style'];
  textStyle?: StyleProp<TextStyle>;
  appearance?: ButtonAppearance;
  icon?: IconName;
  displayTitle?: string;
  iconOnly?: boolean;
  selected?: boolean;
  busy?: boolean;
  expanded?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const kind = appearance ?? 'secondary';
  const tint = disabled ? colors.textSecondary : kind === 'primary' ? colors.onPrimary
    : kind === 'danger' ? colors.error : kind === 'quiet' ? colors.link : colors.text;
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, selected, busy, expanded }}
      testID={label}
      onPress={onPress}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={(state) => [
        styles.button,
        styles[kind],
        state.pressed && (kind === 'primary' ? styles.primaryPressed : styles.pressed),
        focused && styles.focused,
        (selected || expanded) && kind !== 'primary' && styles.selected,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {icon ? <AppIcon name={icon} color={tint} /> : null}
      {!iconOnly || busy ? <Text style={[styles.text, { color: tint }, textStyle]}>{displayTitle ?? title}</Text> : null}
    </Pressable>
  );
}

const useStyles = createThemedStyles((colors) => ({
  button: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borderWidths.control,
    borderColor: colors.controlBorder,
    borderRadius: borderRadius.control,
    flexDirection: 'row',
    gap: spacing.x2,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  quiet: {
    backgroundColor: 'transparent',
    borderWidth: spacing.none,
  },
  danger: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
  },
  pressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  focused: { outlineColor: colors.focus, outlineWidth: 2, outlineOffset: 2, borderColor: colors.focus },
  selected: { backgroundColor: colors.selection, borderColor: colors.focus },
  disabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
  },
  text: {
    ...textStyles.label,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
}));
