import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '../../constants/theme';
import { ActionButton } from '../components/ActionButton';

describe('tons visuais de controles', () => {
  it.each(['todo', 'doing', 'done'] as const)('aplica o tom %s sem alterar nome acessível ou callback', async (tone) => {
    const action = jest.fn();
    await render(<ActionButton label="acao" title="Salvar pedido" icon="check" appearance="primary" tone={tone} onPress={action} />);
    const button = screen.getByRole('button', { name: 'Salvar pedido' });
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(colors[tone]);
    expect(StyleSheet.flatten(screen.getByText('Salvar pedido').props.style).color).toBe(colors.onPrimary);
    expect(action).not.toHaveBeenCalled();
    await fireEvent.press(button);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('controles sem contexto continuam seguindo a identidade azul', async () => {
    await render(<ActionButton label="geral" title="Novo pedido" appearance="primary" onPress={() => {}} />);
    expect(StyleSheet.flatten(screen.getByTestId('geral').props.style).backgroundColor).toBe(colors.primary);
  });

  it('perigo permanece vermelho mesmo com tom, seleção, expansão e desabilitação', async () => {
    const action = jest.fn();
    await render(<ActionButton label="cancelar" title="Cancelar pedido" appearance="danger" tone="done"
      selected expanded disabled onPress={action} />);
    const button = screen.getByTestId('cancelar');
    const style = StyleSheet.flatten(button.props.style);
    expect(style.backgroundColor).toBe(colors.errorSurface);
    expect(style.borderColor).toBe(colors.error);
    expect(StyleSheet.flatten(screen.getByText('Cancelar pedido').props.style).color).toBe(colors.error);
    await fireEvent.press(button);
    expect(action).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
