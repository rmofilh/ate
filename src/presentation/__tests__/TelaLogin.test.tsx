import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaLogin from '../../app/(auth)/login';
import { DadosDeOutroUsuarioError } from '../../main/auth/protegerDonoDosDados';
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

  async function entrarCom(email: string, senha: string) {
    await fireEvent.changeText(screen.getByTestId('campo-email'), email);
    await fireEvent.changeText(screen.getByTestId('campo-senha'), senha);
    await fireEvent.press(screen.getByTestId('botao-entrar'));
  }

  function outraConta() {
    return jest.fn(async () => {
      throw new DadosDeOutroUsuarioError();
    });
  }

  it('mostra a mensagem real do erro (ex.: sem conexão)', async () => {
    const login = jest.fn(async () => {
      throw new Error('Sem conexão: entre uma vez com internet para usar o app offline.');
    });
    await render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {} }}>
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await entrarCom('a@ate.app', '1');

    await waitFor(() => expect(screen.getByTestId('erro-login')).toHaveTextContent(/Sem conexão/));
  });

  it('outra conta com dados locais: avisa, pede confirmação e só então apaga e entra', async () => {
    const apagarDadosEEntrar = jest.fn(async () => {});
    await render(
      <AuthContext.Provider
        value={{ session: null, login: outraConta(), logout: async () => {}, apagarDadosEEntrar }}
      >
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await entrarCom('b@ate.app', '2');

    await waitFor(() =>
      expect(screen.getByTestId('aviso-outra-conta')).toHaveTextContent(/outra conta/),
    );
    await fireEvent.press(screen.getByTestId('botao-apagar-e-entrar'));
    expect(apagarDadosEEntrar).not.toHaveBeenCalled();

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(apagarDadosEEntrar).toHaveBeenCalledWith('b@ate.app', '2'));
  });

  it('cancelar a confirmação não apaga nada', async () => {
    const apagarDadosEEntrar = jest.fn(async () => {});
    await render(
      <AuthContext.Provider
        value={{ session: null, login: outraConta(), logout: async () => {}, apagarDadosEEntrar }}
      >
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await entrarCom('b@ate.app', '2');
    await fireEvent.press(await screen.findByTestId('botao-apagar-e-entrar'));

    await fireEvent.press(screen.getByTestId('dialog-cancel'));

    expect(apagarDadosEEntrar).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog-confirm')).toBeNull();
  });
});
