import PlatformDatePicker from '@expo/ui/community/datetime-picker';
import React, { useState } from 'react';
import { Platform, Text } from 'react-native';

import { useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { calendarPickerSelection, calendarPickerValue } from '@/presentation/utils/datePicker';
import { ActionButton } from './ActionButton';
import { ConfirmationLayer } from './ConfirmationLayer';

export interface DatePickerProps {
  value: string;
  label: string;
  onSelect(value: string): void;
  onDismiss(): void;
}

export default function DatePicker({ value, label, onSelect, onDismiss }: DatePickerProps) {
  const [draft, setDraft] = useState(() => calendarPickerValue(value));
  const { colors, scheme } = useDesignTheme();
  const uiStyles = useUIStyles();
  if (Platform.OS === 'android') {
    // Material 3 emits midnight UTC; local getters would select the previous day in Brazil.
    return <PlatformDatePicker testID="calendario-nativo" value={draft} mode="date" presentation="dialog" accentColor={colors.focus}
      positiveButton={{ label: 'Escolher data' }} negativeButton={{ label: 'Cancelar' }}
      onValueChange={(_event, date) => onSelect(calendarPickerSelection(date))} onDismiss={onDismiss} />;
  }
  return <ConfirmationLayer onDismiss={onDismiss}>
    <Text accessibilityRole="header" style={uiStyles.heading}>{label}</Text>
    <PlatformDatePicker testID="calendario-nativo" value={draft} mode="date" display="inline"
      locale="pt_BR" timeZoneName="UTC" themeVariant={scheme} accentColor={colors.focus}
      onValueChange={(_event, date) => setDraft(date)} />
    <ActionButton label="confirmar-data" title="Escolher data" icon="check" appearance="primary"
      onPress={() => onSelect(calendarPickerSelection(draft))} />
    <ActionButton label="cancelar-data" title="Cancelar" appearance="quiet" onPress={onDismiss} />
  </ConfirmationLayer>;
}
