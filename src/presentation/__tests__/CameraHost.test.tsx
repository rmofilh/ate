import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { cameraDeTeste } from '../../test-support/mocks/expoCamera';
import { CameraHost } from '../components/camera/CameraHost';

function setup() {
  const destino = { armazenar: jest.fn(async () => 'fotos/aceita.jpg') };
  const gateway = new ExpoCameraGateway(destino);
  return { destino, gateway };
}

describe('CameraHost', () => {
  beforeEach(() => cameraDeTeste.reiniciar());

  it('sem ponte não registra nada e não quebra', async () => {
    await render(<CameraHost />);
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('capture() abre o modal e "Usar foto" entrega a foto ao armazenamento', async () => {
    const { gateway, destino } = setup();
    await render(<CameraHost ponte={gateway} />);
    expect(screen.queryByTestId('camera-view')).toBeNull();

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await fireEvent.press(await screen.findByTestId('botao-capturar'));
    await fireEvent.press(await screen.findByTestId('botao-usar-foto'));

    await expect(captura).resolves.toBe('fotos/aceita.jpg');
    expect(destino.armazenar).toHaveBeenCalledWith({
      uri: 'file:///cache/Camera/foto.jpg',
      largura: 4000,
      altura: 3000,
    });
    await waitFor(() => expect(screen.queryByTestId('camera-view')).toBeNull());
  });

  it('cancelar devolve null e fecha o modal', async () => {
    const { gateway } = setup();
    await render(<CameraHost ponte={gateway} />);

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await fireEvent.press(await screen.findByTestId('botao-cancelar-camera'));

    await expect(captura).resolves.toBeNull();
    await waitFor(() => expect(screen.queryByTestId('camera-view')).toBeNull());
  });

  it('desmontar no meio da captura termina a Promise como cancelamento', async () => {
    const { gateway } = setup();
    const { unmount } = await render(<CameraHost ponte={gateway} />);

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await screen.findByTestId('camera-view');
    await act(async () => unmount());

    await expect(captura).resolves.toBeNull();
    await expect(gateway.capture()).rejects.toThrow(/indisponível/);
  });
});
