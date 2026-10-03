import { parseCalendarDate } from './date';

/** Calendar days, not instants. Both native adapters display UTC explicitly. */
export function calendarPickerValue(value: string): Date {
  const parsed = parseCalendarDate(value);
  if (parsed) return parsed;
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
}

export function calendarPickerSelection(value: Date): string {
  return value.toISOString().slice(0, 10);
}
