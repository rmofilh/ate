import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import type { PressableProps, StyleProp, TextStyle } from 'react-native';

import { borderRadius, borderWidths, layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { getControlTone, type ControlTone } from '@/presentation/styles/controlTone';
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
  tone,
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
  tone?: ControlTone;
}) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const kind = appearance ?? 'secondary';
  const context = tone && kind !== 'danger' ? getControlTone(colors, tone) : null;
  const tint = kind === 'danger' ? colors.error : disabled ? colors.textSecondary
    : kind === 'primary' ? context?.onStrong ?? colors.onPrimary
    : context?.foreground ?? (kind === 'quiet' ? colors.link : colors.text);
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled, selected, busy, expanded }}
      aria-disabled={disabled}
      aria-busy={busy}
      aria-expanded={expanded}
      {...(Platform.OS === 'web' && selected !== undefined ? { 'aria-pressed': selected } : {})}
      testID={label}
      onPress={onPress}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={(state) => [
        styles.button,
        styles[kind],
        context && (kind === 'primary'
          ? { backgroundColor: context.foreground, borderColor: context.foreground }
          : { borderColor: context.foreground }),
        state.pressed && (kind === 'danger' || (context && kind === 'primary') ? styles.tonePressed
          : context ? { backgroundColor: context.surface }
          : kind === 'primary' ? styles.primaryPressed : styles.pressed),
        focused && styles.focused,
        focused && (kind === 'danger' || context) && {
          outlineColor: kind === 'danger' ? colors.error : context!.foreground,
          borderColor: kind === 'danger' ? colors.error : context!.foreground,
        },
        (selected || expanded) && kind !== 'primary' && kind !== 'danger' && (context
          ? { backgroundColor: context.surface, borderColor: context.foreground } : styles.selected),
        disabled && styles.disabled,
        disabled && kind === 'danger' && styles.disabledDanger,
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
  tonePressed: { opacity: 0.92 },
  focused: { outlineColor: colors.focus, outlineWidth: 2, outlineOffset: 2, borderColor: colors.focus },
  selected: { backgroundColor: colors.selection, borderColor: colors.focus },
  disabled: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
  },
  disabledDanger: { backgroundColor: colors.errorSurface, borderColor: colors.error, opacity: 0.65 },
  text: {
    ...textStyles.label,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
}));
