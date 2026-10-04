import type { ThemeColors } from '@/constants/theme';

export type ControlTone = 'todo' | 'doing' | 'done';

/** Shared visual context; danger actions are handled independently by ActionButton. */
export function getControlTone(colors: ThemeColors, tone: ControlTone) {
  return { foreground: colors[tone], surface: colors[`${tone}Surface`], onStrong: colors.onPrimary };
}
