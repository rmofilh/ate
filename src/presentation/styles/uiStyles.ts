import { StyleSheet } from 'react-native';

import { borderRadius, colors, layout, spacing, textStyles } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';

const makeStyles = (colors: import('@/constants/theme').ThemeColors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x6,
    gap: spacing.x6,
  },
  formContent: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.x6,
    alignItems: 'center' as const,
  },
  formColumn: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    gap: spacing.x6,
    backgroundColor: colors.surface,
    padding: spacing.x5,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listColumn: {
    width: '100%',
    maxWidth: layout.listMaxWidth,
    gap: spacing.x4,
    alignSelf: 'center',
  },
  field: {
    gap: spacing.x2,
  },
  choices: {
    gap: spacing.x2,
  },
  choicesRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.x2,
  },
  choice: {
    alignItems: 'stretch' as const,
  },
  choiceText: {
    textAlign: 'left' as const,
  },
  title: {
    ...textStyles.title,
    color: colors.text,
  },
  heading: {
    ...textStyles.heading,
    color: colors.text,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
  },
  body: {
    ...textStyles.body,
    color: colors.text,
  },
  muted: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  error: {
    ...textStyles.body,
    color: colors.error,
    backgroundColor: colors.errorSurface,
    padding: spacing.x3,
    borderRadius: borderRadius.control,
  },
  notice: {
    ...textStyles.body,
    color: colors.focus,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.x3,
    borderRadius: borderRadius.control,
  },
  empty: {
    ...textStyles.body,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.x4,
    borderRadius: borderRadius.control,
  },
  actions: {
    gap: spacing.x2,
  },
} as const);

export const uiStyles = StyleSheet.create(makeStyles(colors));
export const useUIStyles = createThemedStyles(makeStyles);
