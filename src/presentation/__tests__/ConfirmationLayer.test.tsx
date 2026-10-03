import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ConfirmationLayer } from '../components/ConfirmationLayer';

describe('diálogo de confirmação', () => {
  it('voltar pelo sistema solicita cancelamento, nunca confirmação', async () => {
    const dismiss = jest.fn();
    await render(<ConfirmationLayer onDismiss={dismiss}><Text>Confirmar operação</Text></ConfirmationLayer>);
    await fireEvent(screen.getByTestId('confirmation-modal'), 'requestClose');
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('operação pendente impede fechar pelo botão ou pelo sistema', async () => {
    const dismiss = jest.fn();
    await render(<ConfirmationLayer onDismiss={dismiss} busy><Text>Salvando...</Text></ConfirmationLayer>);
    await fireEvent.press(screen.getByTestId('fechar-confirmacao'));
    await fireEvent(screen.getByTestId('confirmation-modal'), 'requestClose');
    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('fechar-confirmacao')).toBeDisabled();
  });
});
