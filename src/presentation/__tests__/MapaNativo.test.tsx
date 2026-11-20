import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { mapLibreDeTeste, toqueNoMapa } from '../../test-support/mocks/maplibre';
import { MapaNativo } from '../components/mapa/MapaNativo';
import { NetworkContext } from '../hooks/AppProviders';

const CENTRO = { latitude: -19.92, longitude: -43.94 };
const marcadores = [
  { id: 'e1', titulo: 'Feira 1', latitude: -19.9, longitude: -43.9 },
  { id: 'e2', titulo: 'Feira 2', latitude: -20.1, longitude: -44.1 },
];

beforeEach(() => mapLibreDeTeste.reiniciar());

describe('MapaNativo (MapLibre)', () => {
  it('usa o estilo do OpenFreeMap com atribuição e sem WebView', async () => {
    await render(<MapaNativo centroInicial={CENTRO} zoomInicial={12} />);
    const mapa = screen.getByTestId('mapa');
    expect(mapa.props.mapStyle).toBe('https://tiles.openfreemap.org/styles/liberty');
    expect(mapa.props.attribution).toBe(true);
  });

  it('sem foco, enquadra todos os eventos; com foco, centraliza no informado', async () => {
    const { rerender } = await render(
      <MapaNativo centroInicial={CENTRO} zoomInicial={15} somenteLeitura marcadores={marcadores} />,
    );
    expect(screen.getByTestId('camera').props.initialViewState).toMatchObject({
      bounds: [-44.1, -20.1, -43.9, -19.9],
    });

    await rerender(<></>);
    await render(
      <MapaNativo
        centroInicial={marcadores[1]}
        zoomInicial={15}
        somenteLeitura
        marcadores={marcadores}
        marcadorEmFoco="e2"
      />,
    );
    expect(screen.getByTestId('camera').props.initialViewState).toEqual({
      center: [-44.1, -20.1],
      zoom: 15,
    });
    expect(screen.getByTestId('anotacao-e2').props.selected).toBe(true);
  });

  it('somente leitura: toque no mapa não coloca pin; toque no evento seleciona', async () => {
    const onEscolher = jest.fn();
    const onSelecionarMarcador = jest.fn();
    await render(
      <MapaNativo
        centroInicial={CENTRO}
        zoomInicial={12}
        somenteLeitura
        marcadores={marcadores}
        onEscolher={onEscolher}
        onSelecionarMarcador={onSelecionarMarcador}
      />,
    );

    await fireEvent(screen.getByTestId('mapa'), 'press', toqueNoMapa(-19.95, -43.95));
    await fireEvent.press(screen.getByTestId('anotacao-e1'));

    expect(onEscolher).not.toHaveBeenCalled();
    expect(screen.queryByTestId('anotacao-pin')).toBeNull();
    expect(onSelecionarMarcador).toHaveBeenCalledWith('e1');
  });

  it('sem internet avisa que só as áreas baixadas têm ruas', async () => {
    await render(
      <NetworkContext.Provider value={{ isOnline: false, setOnline: () => {} }}>
        <MapaNativo centroInicial={CENTRO} zoomInicial={12} />
      </NetworkContext.Provider>,
    );
    expect(screen.getByTestId('mapa-offline')).toHaveTextContent(/áreas já baixadas/);
  });

  it('no Expo Go, o mapa de consulta remete à lista', async () => {
    mapLibreDeTeste.disponivel = false;
    await render(<MapaNativo centroInicial={CENTRO} zoomInicial={12} somenteLeitura />);
    expect(screen.getByTestId('mapa-indisponivel')).toHaveTextContent(/lista/);
    expect(screen.queryByTestId('mapa')).toBeNull();
  });
});
