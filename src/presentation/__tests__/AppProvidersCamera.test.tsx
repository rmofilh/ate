import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { cameraDeTeste } from '../../test-support/mocks/expoCamera';
import { AppProviders } from '../hooks/AppProviders';

describe('AppProviders e câmera', () => {
  beforeEach(() => cameraDeTeste.reiniciar());

  it('chama aoIniciar uma vez na montagem', async () => {
    const aoIniciar = jest.fn(async () => {});
    const providers = { ...makeFakeProviders(), aoIniciar };

    const { rerender } = await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);
    await rerender(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    expect(aoIniciar).toHaveBeenCalledTimes(1);
  });

  it('falha no aoIniciar não derruba o app', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const providers = { ...makeFakeProviders(), aoIniciar: jest.fn(async () => { throw new Error('disco'); }) };

    await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    expect(await screen.findByText('app')).toBeTruthy();
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('monta o CameraHost: a ponte da bag abre o modal da câmera', async () => {
    const camera = new ExpoCameraGateway({ armazenar: async () => 'fotos/x.jpg' });
    const providers = { ...makeFakeProviders(), ponteDaCamera: camera };
    await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    await act(async () => {
      void camera.capture();
    });

    expect(await screen.findByTestId('camera-view')).toBeTruthy();
  });
});
