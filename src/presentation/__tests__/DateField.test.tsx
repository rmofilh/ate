import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateField } from '../components/DateField';

jest.mock('@expo/ui/community/datetime-picker', () => ({ __esModule: true, default: 'DateTimePicker' }));

function Form({ onChange = jest.fn(), editable = true }: { onChange?(value: string): void; editable?: boolean }) {
  const [value, setValue] = useState('2026-10-12');
  return <DateField testID="data" accessibilityLabel="Data de entrega" value={value} editable={editable}
    onChangeText={(next) => { setValue(next); onChange(next); }} />;
}

describe('campo de data com calendário', () => {
  afterEach(() => jest.restoreAllMocks());

  it('cancelar descarta a seleção provisória e mantém a entrada manual utilizável', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onChange = jest.fn();
    await render(<Form onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('data-calendario'));
    await waitFor(() => expect(screen.getByTestId('calendario-nativo')).toBeTruthy());
    await fireEvent(screen.getByTestId('calendario-nativo'), 'valueChange', {}, new Date('2026-11-02T12:00:00Z'));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('cancelar-data'));
    expect(screen.getByTestId('data').props.value).toBe('2026-10-12');
    await fireEvent.changeText(screen.getByTestId('data'), '2026-12-10');
    expect(onChange).toHaveBeenLastCalledWith('2026-12-10');
    expect(screen.getByText('10/12/2026')).toBeTruthy();
  });

  it('confirmar seleciona o dia brasileiro sem mudar seu formato canônico', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onChange = jest.fn();
    await render(<Form onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('data-calendario'));
    await waitFor(() => expect(screen.getByTestId('calendario-nativo')).toBeTruthy());
    await fireEvent(screen.getByTestId('calendario-nativo'), 'valueChange', {}, new Date('2026-11-02T00:00:00Z'));
    await fireEvent.press(screen.getByTestId('confirmar-data'));
    expect(onChange).toHaveBeenCalledWith('2026-11-02');
    expect(screen.getByTestId('data').props.value).toBe('2026-11-02');
    expect(screen.getByText('02/11/2026')).toBeTruthy();
    expect(screen.queryByTestId('calendario-nativo')).toBeNull();
  });

  it('confirmação Android preserva o dia emitido à meia-noite UTC', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onChange = jest.fn();
    await render(<Form onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('data-calendario'));
    await waitFor(() => expect(screen.getByTestId('calendario-nativo')).toBeTruthy());
    await fireEvent(screen.getByTestId('calendario-nativo'), 'valueChange', {}, new Date('2026-10-13T00:00:00Z'));
    expect(onChange).toHaveBeenCalledWith('2026-10-13');
    expect(screen.getByText('13/10/2026')).toBeTruthy();
  });

  it('cancelar o calendário Android não altera a data', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onChange = jest.fn();
    await render(<Form onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('data-calendario'));
    await waitFor(() => expect(screen.getByTestId('calendario-nativo')).toBeTruthy());
    await fireEvent(screen.getByTestId('calendario-nativo'), 'dismiss');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('calendario-nativo')).toBeNull();
  });

  it('campo desabilitado não abre o calendário', async () => {
    await render(<Form editable={false} />);
    expect(screen.getByTestId('data-calendario')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('data-calendario'));
    expect(screen.queryByTestId('calendario-nativo')).toBeNull();
  });
});
