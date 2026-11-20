import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { AppProviders, useAuth } from '../hooks/AppProviders';

function Sonda() {
  const { restaurando, session } = useAuth();
  return (
    <Text testID="estado">{restaurando ? 'restaurando' : session ? 'logado' : 'deslogado'}</Text>
  );
}

describe('restauração da sessão', () => {
  it('fica em "restaurando" até o getSession responder', async () => {
    const providers = makeFakeProviders();
    let responder!: (valor: { userId: string; token: string } | null) => void;
    jest.spyOn(providers.gateways.auth, 'getSession').mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );

    await render(
      <AppProviders providers={providers}>
        <Sonda />
      </AppProviders>,
    );
    expect(screen.getByTestId('estado')).toHaveTextContent('restaurando');

    responder({ userId: providers.usuarioId, token: 't' });
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('logado'));
  });

  it('falha ao restaurar termina deslogado, sem travar em "restaurando"', async () => {
    const providers = makeFakeProviders();
    jest.spyOn(providers.gateways.auth, 'getSession').mockRejectedValue(new Error('storage'));

    await render(
      <AppProviders providers={providers}>
        <Sonda />
      </AppProviders>,
    );

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('deslogado'));
  });
});

describe('sessão encerrada pelo servidor (onAuthStateChange)', () => {
  it('volta para deslogado e cancela a escuta ao desmontar', async () => {
    const providers = makeFakeProviders();
    await providers.gateways.auth.login('artesao@email.com', '123456');
    let encerrar!: () => void;
    const parar = jest.fn();
    const bag = {
      ...providers,
      aoEncerrarSessao: (ouvinte: () => void) => {
        encerrar = ouvinte;
        return parar;
      },
    };

    const tela = await render(
      <AppProviders providers={bag}>
        <Sonda />
      </AppProviders>,
    );
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent(/^logado/));

    await act(async () => encerrar());
    expect(screen.getByTestId('estado')).toHaveTextContent('deslogado');

    await tela.unmount();
    expect(parar).toHaveBeenCalled();
  });
});
