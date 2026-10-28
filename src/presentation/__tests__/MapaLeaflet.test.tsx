import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { mensagemDaPagina, webviewDeTeste } from '../../test-support/mocks/reactNativeWebview';
import { MapaLeaflet, type MapaLeafletRef, htmlDoMapa } from '../components/mapa/MapaLeaflet';

beforeEach(() => webviewDeTeste.reiniciar());

const CENTRO = { latitude: -23.5614, longitude: -46.6558 };

describe('htmlDoMapa', () => {
  it('usa Leaflet com versão fixa e blocos do OpenStreetMap com atribuição', () => {
    const html = htmlDoMapa(CENTRO, 15, null);

    expect(html).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
    expect(html).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    expect(html).toContain('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(html).toContain('OpenStreetMap');
  });

  it('abre centralizado no ponto e no zoom pedidos', () => {
    const html = htmlDoMapa(CENTRO, 15, null);

    expect(html).toContain('setView([-23.5614,-46.6558],15)');
    expect(html).not.toContain('colocarPin(-23.5614');
  });

  it('com pin inicial, já desenha o pin', () => {
    expect(htmlDoMapa(CENTRO, 15, CENTRO)).toContain('colocarPin(-23.5614,-46.6558,false)');
  });

  it('avisa o app quando o Leaflet não carrega (sem internet)', () => {
    expect(htmlDoMapa(CENTRO, 15, null)).toContain("tipo:'erro'");
  });
});

describe('MapaLeaflet', () => {
  async function renderizar(pinInicial: typeof CENTRO | null = null) {
    const onEscolher = jest.fn();
    const ref = createRef<MapaLeafletRef>();
    await render(
      <MapaLeaflet ref={ref} centroInicial={CENTRO} zoomInicial={15} pinInicial={pinInicial}
        onEscolher={onEscolher} />,
    );
    return { onEscolher, ref };
  }

  it('renderiza a WebView com o HTML do mapa e identificação no user agent', async () => {
    await renderizar();

    const webview = screen.getByTestId('mapa');
    expect(webview.props.source.html).toContain('leaflet');
    expect(webview.props.source.baseUrl).toMatch(/^https:\/\//);
    expect(webview.props.applicationNameForUserAgent).toMatch(/ate/);
  });

  it('toque ou arrasto na página chega como coordenada escolhida', async () => {
    const { onEscolher } = await renderizar();

    await fireEvent(screen.getByTestId('mapa'), 'message',
      mensagemDaPagina({ tipo: 'pin', latitude: -23.55, longitude: -46.64 }));

    expect(onEscolher).toHaveBeenCalledWith({ latitude: -23.55, longitude: -46.64 });
  });

  it('ignora mensagens inválidas ou fora da faixa', async () => {
    const { onEscolher } = await renderizar();
    const webview = screen.getByTestId('mapa');

    await fireEvent(webview, 'message', { nativeEvent: { data: 'não é json' } });
    await fireEvent(webview, 'message', mensagemDaPagina({ tipo: 'pin', latitude: 120, longitude: 0 }));
    await fireEvent(webview, 'message', mensagemDaPagina({ tipo: 'outro' }));

    expect(onEscolher).not.toHaveBeenCalled();
  });

  it('sem internet mostra o aviso de mapa indisponível', async () => {
    await renderizar();
    expect(screen.queryByTestId('mapa-indisponivel')).toBeNull();

    await fireEvent(screen.getByTestId('mapa'), 'message', mensagemDaPagina({ tipo: 'erro' }));

    expect(screen.getByTestId('mapa-indisponivel')).toHaveTextContent(/sem internet/i);
  });

  it('falha ao carregar a página também mostra o aviso', async () => {
    await renderizar();

    await fireEvent(screen.getByTestId('mapa'), 'error', { nativeEvent: { description: 'net' } });

    expect(screen.getByTestId('mapa-indisponivel')).toBeTruthy();
  });

  it('centralizar move o pin e o mapa pela página', async () => {
    const { ref } = await renderizar();

    await act(async () => ref.current?.centralizar({ latitude: -22.9, longitude: -43.2 }));

    expect(webviewDeTeste.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('colocarPin(-22.9,-43.2,true)'),
    );
  });
});
