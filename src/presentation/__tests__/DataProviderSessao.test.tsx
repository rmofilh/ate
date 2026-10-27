import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { ErroDadosBanner } from '../components/ErroDadosBanner';
import { AppProviders, useAuth, useData } from '../hooks/AppProviders';

function Sonda() {
  const { pedidos } = useData();
  const { login, logout } = useAuth();
  return (
    <>
      <Text testID="qtd-pedidos">{pedidos.length}</Text>
      <Text testID="entrar" onPress={() => void login('artesao@email.com', '123456')}>entrar</Text>
      <Text testID="sair" onPress={() => void logout()}>sair</Text>
      <ErroDadosBanner />
    </>
  );
}

describe('DataProvider e sessão', () => {
  it('mantém os dados iniciais sem sessão e zera no logout', async () => {
    const providers = makeFakeProviders();
    await render(<AppProviders providers={providers}><Sonda /></AppProviders>);
    expect(screen.getByTestId('qtd-pedidos')).toHaveTextContent(String(providers.pedidos.length));

    await fireEvent.press(screen.getByTestId('entrar'));
    await waitFor(() =>
      expect(screen.getByTestId('qtd-pedidos')).toHaveTextContent(String(providers.pedidos.length)),
    );

    await fireEvent.press(screen.getByTestId('sair'));
    await waitFor(() => expect(screen.getByTestId('qtd-pedidos')).toHaveTextContent('0'));
  });

  it('exibe a falha de leitura em vez de engolir o erro', async () => {
    const providers = makeFakeProviders();
    providers.loadData = async () => {
      throw new Error('banco indisponível');
    };
    await render(<AppProviders providers={providers}><Sonda /></AppProviders>);
    expect(screen.queryByTestId('banner-erro-dados')).toBeNull();

    await fireEvent.press(screen.getByTestId('entrar'));

    await waitFor(() =>
      expect(screen.getByTestId('banner-erro-dados')).toHaveTextContent(/banco indisponível/),
    );
  });
});
