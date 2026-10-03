import React, { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { spacing } from '@/constants/theme';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { formatCalendarDate, parseCalendarDate } from '@/presentation/utils/date';
import { IconButton } from './IconButton';
import { StyledTextInput } from './StyledTextInput';
import DatePicker from './DatePicker';

/** Retains the actual controlled input contract; the calendar fills that same value. */
export function DateField(props: TextInputProps & { value: string; onChangeText(value: string): void }) {
  const [open, setOpen] = useState(false);
  const styles = useStyles();
  const uiStyles = useUIStyles();
  const date = parseCalendarDate(props.value);
  return <View style={styles.field}>
    <View style={styles.row}>
      <StyledTextInput {...props} placeholder={props.placeholder ?? 'AAAA-MM-DD'} style={[styles.input, props.style]} />
      <IconButton label={`${props.testID}-calendario`} title={`Escolher ${props.accessibilityLabel?.toLowerCase() ?? 'data'} no calendário`}
        icon="calendar" expanded={open} disabled={props.editable === false} appearance="secondary"
        onPress={() => { Keyboard.dismiss(); setOpen(true); }} />
    </View>
    <Text style={uiStyles.muted}>{date ? formatCalendarDate(date) : 'Escolha no calendário ou digite ano-mês-dia.'}</Text>
    {open ? <DatePicker value={props.value} label={props.accessibilityLabel ?? 'Escolher data'}
        onDismiss={() => setOpen(false)} onSelect={(value) => { props.onChangeText(value); setOpen(false); }} />
      : null}
  </View>;
}

const useStyles = createThemedStyles(() => ({
  field: { gap: spacing.x2 },
  row: { flexDirection: 'row', gap: spacing.x2, alignItems: 'center' },
  input: { flex: 1, minWidth: 0 },
}));
