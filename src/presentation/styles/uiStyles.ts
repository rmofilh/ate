import { StyleSheet } from 'react-native';

import { borderRadius, colors, layout, spacing, textStyles } from '@/constants/theme';

export const uiStyles = StyleSheet.create({
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
    alignItems: 'center',
  },
  formColumn: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    gap: spacing.x6,
  },
  field: {
    gap: spacing.x2,
  },
  choices: {
    gap: spacing.x2,
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.x2,
  },
  choice: {
    alignItems: 'stretch',
  },
  choiceText: {
    textAlign: 'left',
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
  error: {
    ...textStyles.body,
    color: colors.error,
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
  },
  actions: {
    gap: spacing.x2,
  },
});
