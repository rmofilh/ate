import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, Linking } from 'react-native';

import { cameraDeTeste, permissoes } from '../../test-support/mocks/expoCamera';
import { CameraModal } from '../components/camera/CameraModal';

async function montar() {
  const onResultado = jest.fn();
  await render(<CameraModal visivel onResultado={onResultado} />);
  return { onResultado };
}

describe('CameraModal', () => {
  let aoMudarAppState: ((estado: string) => void) | null;

  beforeEach(() => {
    cameraDeTeste.reiniciar();
    aoMudarAppState = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, handler) => {
      aoMudarAppState = handler as (estado: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('invisível não monta a câmera', async () => {
    await render(<CameraModal visivel={false} onResultado={jest.fn()} />);
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('enquanto a permissão carrega, mostra espera e permite cancelar', async () => {
    cameraDeTeste.permissao = null;
    const { onResultado } = await montar();
    await screen.findByTestId('camera-carregando');

    await fireEvent.press(screen.getByTestId('botao-cancelar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('permissão indeterminada: explica e pede; concedida abre a câmera', async () => {
    cameraDeTeste.permissao = permissoes.indeterminada;
    await montar();
    await screen.findByTestId('camera-sem-permissao');

    await fireEvent.press(screen.getByTestId('botao-permitir-camera'));

    expect(cameraDeTeste.pedirPermissao).toHaveBeenCalledTimes(1);
    await screen.findByTestId('camera-view');
  });

  it('voltar sem ter decidido a permissão é cancelamento', async () => {
    cameraDeTeste.permissao = permissoes.indeterminada;
    const { onResultado } = await montar();
    await fireEvent.press(await screen.findByTestId('botao-voltar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('voltar com a permissão negada devolve negado', async () => {
    cameraDeTeste.permissao = permissoes.negada;
    const { onResultado } = await montar();
    await fireEvent.press(await screen.findByTestId('botao-voltar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'negado' });
  });

  it('negada para sempre: oferece abrir configurações e relê a permissão na volta', async () => {
    cameraDeTeste.permissao = permissoes.negadaParaSempre;
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await montar();
    expect(screen.queryByTestId('botao-permitir-camera')).toBeNull();

    await fireEvent.press(await screen.findByTestId('botao-abrir-configuracoes'));
    expect(abrir).toHaveBeenCalledTimes(1);

    cameraDeTeste.permissao = permissoes.concedida;
    await act(async () => aoMudarAppState?.('active'));

    expect(cameraDeTeste.lerPermissao).toHaveBeenCalled();
    await screen.findByTestId('camera-view');
  });

  it('botão de captura só habilita depois de onCameraReady', async () => {
    cameraDeTeste.prontaAoMontar = false;
    await montar();
    const botao = await screen.findByTestId('botao-capturar');
    expect(botao.props.accessibilityState.disabled).toBe(true);

    await act(async () => cameraDeTeste.ficarPronta());

    expect(screen.getByTestId('botao-capturar').props.accessibilityState.disabled).toBe(false);
  });

  it('captura → revisão → refazer → captura → usar devolve a foto com dimensões', async () => {
    const { onResultado } = await montar();
    await fireEvent.press(await screen.findByTestId('botao-capturar'));
    await screen.findByTestId('camera-preview');
    expect(cameraDeTeste.takePictureAsync).toHaveBeenCalledWith({ quality: 1 });

    await fireEvent.press(screen.getByTestId('botao-refazer-foto'));
    await screen.findByTestId('camera-view');

    cameraDeTeste.proximaFoto = { uri: 'file:///cache/Camera/segunda.jpg', width: 3000, height: 4000, format: 'jpg' };
    await fireEvent.press(screen.getByTestId('botao-capturar'));
    await fireEvent.press(await screen.findByTestId('botao-usar-foto'));

    expect(onResultado).toHaveBeenCalledTimes(1);
    expect(onResultado).toHaveBeenCalledWith({
      tipo: 'foto',
      uri: 'file:///cache/Camera/segunda.jpg',
      largura: 3000,
      altura: 4000,
    });
  });

  it('falha ao tirar a foto mostra o erro e continua na câmera', async () => {
    cameraDeTeste.takePictureAsync.mockRejectedValueOnce(new Error('sensor ocupado'));
    await montar();
    await fireEvent.press(await screen.findByTestId('botao-capturar'));

    await waitFor(() => expect(screen.getByTestId('camera-erro')).toHaveTextContent(/sensor ocupado/));
    expect(screen.getByTestId('camera-view')).toBeTruthy();
  });

  it('erro ao montar a câmera aparece e cancelar continua funcionando', async () => {
    cameraDeTeste.erroAoMontar = 'Câmera em uso por outro app';
    const { onResultado } = await montar();

    await waitFor(() => expect(screen.getByTestId('camera-erro')).toHaveTextContent(/outro app/));
    expect(screen.getByTestId('botao-capturar').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('botao-cancelar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('botão voltar do Android cancela', async () => {
    const { onResultado } = await montar();
    await screen.findByTestId('camera-view');

    // RNTL 14 não tem mais UNSAFE_getByType: o Modal recebe testID e o evento é disparado nele.
    await fireEvent(screen.getByTestId('camera-modal'), 'requestClose');

    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });
});
