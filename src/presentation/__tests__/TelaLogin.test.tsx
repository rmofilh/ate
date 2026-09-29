import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaLogin from '../../app/(auth)/login';
import { AuthContext } from '../hooks/AppProviders';

describe('TelaLogin', () => {
  it('loga com credencial válida e mostra erro com inválida', async () => {
    const login = jest.fn(async (email: string, password: string) => {
      if (email === 'artesao@email.com' && password === '123456') return;
      throw new Error('E-mail ou senha incorretos');
    });
    await render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {} }}>
        <TelaLogin />
      </AuthContext.Provider>,
    );

    await fireEvent.changeText(screen.getByTestId('campo-email'), 'artesao@email.com');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), '123456');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('artesao@email.com', '123456'),
    );

    await fireEvent.changeText(screen.getByTestId('campo-senha'), 'errada');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() => expect(screen.getByTestId('erro-login')).toBeTruthy());
  });
});
