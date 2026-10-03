import React, { forwardRef, useState } from 'react';
import { Platform, TextInput as NativeTextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

import { borderRadius, borderWidths, layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';

export const StyledTextInput = forwardRef<NativeTextInput, TextInputProps>(function StyledTextInput(
  { style, onFocus, onBlur, ...props }, ref,
) {
  const [focused, setFocused] = useState(false);
  const { colors } = useDesignTheme();
  const styles = useStyles();

  return (
    <NativeTextInput
      ref={ref}
      selectionColor={Platform.select({ android: colors.selection, default: colors.focus })}
      cursorColor={colors.focus}
      selectionHandleColor={colors.focus}
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[styles.input, props.editable === false && styles.readOnly, focused && styles.focused, style]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
});

const useStyles = createThemedStyles((colors) => ({
  input: {
    ...textStyles.body,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x2,
    borderRadius: borderRadius.control,
    borderWidth: borderWidths.focus,
    borderColor: colors.controlBorder,
    outlineWidth: spacing.none,
  },
  focused: {
    borderWidth: borderWidths.focus,
    borderColor: colors.focus,
  },
  readOnly: {
    backgroundColor: colors.surfaceSecondary,
  },
}));
