import React from 'react';
import { render, screen } from '@testing-library/react-native';

import TelaLogin from '../../../app/(auth)/login';
import { ActionButton } from '../components/ActionButton';

describe('acessibilidade da apresentação', () => {
  it('botão anuncia o texto humano e mantém seletor técnico em testID', () => {
    render(
      <ActionButton
        label="botao-interno"
        title="Salvar pedido"
        onPress={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Salvar pedido' })).toBeTruthy();
    expect(screen.getByTestId('botao-interno')).toBeTruthy();
    expect(screen.queryByLabelText('botao-interno')).toBeNull();
  });

  it('campos de login anunciam nomes compreensíveis', () => {
    render(<TelaLogin />);

    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
  });
});
