import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';

import { borderRadius, fontFamilies, fontSizes, layout, spacing } from '@/constants/theme';
import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { calendarPickerSelection, calendarPickerValue } from '@/presentation/utils/datePicker';
import { ActionButton } from './ActionButton';
import { ConfirmationLayer } from './ConfirmationLayer';
import type { DatePickerProps } from './DatePicker';

export default function DatePicker({ value, label, onSelect, onDismiss }: DatePickerProps) {
  const [draft, setDraft] = useState(() => calendarPickerSelection(calendarPickerValue(value)));
  const input = useRef<HTMLInputElement>(null);
  const { colors, scheme } = useDesignTheme();
  const uiStyles = useUIStyles();
  const showCalendar = useCallback(() => {
    const field = input.current;
    field?.focus();
    // Some browsers require fresh user activation; the editable date field remains the fallback.
    try { field?.showPicker?.(); } catch { /* Use the field's own calendar control. */ }
  }, []);
  useEffect(showCalendar, [showCalendar]);
  return <ConfirmationLayer onDismiss={onDismiss}>
    <Text accessibilityRole="header" style={uiStyles.heading}>{label}</Text>
    <input ref={input} type="date" lang="pt-BR" aria-label={label} value={draft}
      onChange={(event) => setDraft(event.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: layout.minTouchTarget,
        padding: spacing.x3, borderRadius: borderRadius.control, border: `1px solid ${colors.controlBorder}`,
        color: colors.text, background: colors.surface, fontFamily: fontFamilies.regular,
        fontSize: fontSizes.body, colorScheme: scheme }} />
    <ActionButton label="abrir-calendario-web" title="Abrir calendário" icon="calendar" appearance="secondary"
      onPress={showCalendar} />
    <ActionButton label="confirmar-data" title="Escolher data" icon="check" appearance="primary" disabled={!draft}
      onPress={() => onSelect(draft)} />
    <ActionButton label="cancelar-data" title="Cancelar" appearance="quiet" onPress={onDismiss} />
  </ConfirmationLayer>;
}
