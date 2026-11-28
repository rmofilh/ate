import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaNovoEvento from '../../app/evento/novo';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { FakeGeocodingGateway } from '../../infrastructure/device/FakeGeocodingGateway';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { mapLibreDeTeste, toqueNoMapa } from '../../test-support/mocks/maplibre';
import { NetworkContext, ServicesContext } from '../hooks/AppProviders';

const AFONSO_PENA = {
  rotulo: 'Avenida Afonso Pena – Centro, Belo Horizonte - MG',
  coordenada: new Coordenada(-19.9161, -43.9406),
};

async function montar({ online = true } = {}) {
  const providers = makeFakeProviders();
  const geocodificador = providers.gateways.geocodificador as FakeGeocodingGateway;
  geocodificador.sugestoes = [AFONSO_PENA];
  const onSalvar = jest.fn(async () => {});
  await render(
    <ServicesContext.Provider value={providers}>
      <NetworkContext.Provider value={{ isOnline: online, setOnline: () => {} }}>
        <TelaNovoEvento onSalvar={onSalvar} onConcluido={() => {}} />
      </NetworkContext.Provider>
    </ServicesContext.Provider>,
  );
  return { geocodificador, onSalvar };
}

beforeEach(() => mapLibreDeTeste.reiniciar());

describe('endereço do evento: sugestões ao digitar', () => {
  it('mostra sugestões a partir de 3 letras; escolher preenche o endereço e marca o local', async () => {
    const { geocodificador } = await montar();

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Av Afonso');
    await waitFor(() => expect(screen.getByTestId('sugestao-endereco-0')).toHaveTextContent(AFONSO_PENA.rotulo));
    expect(geocodificador.pedidosDeSugestao).toEqual(['Av Afonso']);

    await fireEvent.press(screen.getByTestId('sugestao-endereco-0'));

    expect(screen.getByTestId('campo-endereco-evento').props.value).toBe(AFONSO_PENA.rotulo);
    expect(screen.getByTestId('ponto-selecionado')).toBeTruthy();
    expect(screen.queryByTestId('sugestoes-endereco')).toBeNull();
    // O texto escolhido não dispara outra busca.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(geocodificador.pedidosDeSugestao).toEqual(['Av Afonso']);
  });

  it('com menos de 3 letras não busca', async () => {
    const { geocodificador } = await montar();
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Av');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(geocodificador.pedidosDeSugestao).toEqual([]);
  });

  it('sem internet não busca e a dica explica como marcar o local', async () => {
    const { geocodificador } = await montar({ online: false });
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Av Afonso Pena');
    await act(async () => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(geocodificador.pedidosDeSugestao).toEqual([]);
    expect(screen.getByTestId('dica-endereco')).toHaveTextContent(/Sem internet/);
  });

  it('com internet, a dica sutil orienta a escolher uma sugestão', async () => {
    await montar();
    expect(screen.getByTestId('dica-endereco')).toHaveTextContent(/escolha uma sugestão/);
  });
});

describe('endereço do evento: a partir do pin no mapa', () => {
  async function marcarNoMapa(latitude: number, longitude: number) {
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    await fireEvent(await screen.findByTestId('mapa'), 'press', toqueNoMapa(latitude, longitude));
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));
  }

  it('campo vazio: o endereço do ponto preenche sozinho', async () => {
    const { geocodificador } = await montar();
    geocodificador.enderecoDoPonto = 'Rua Juruá – Centro, Pouso Alegre - MG';

    await marcarNoMapa(-22.23, -45.93);

    await waitFor(() =>
      expect(screen.getByTestId('campo-endereco-evento').props.value).toBe(
        'Rua Juruá – Centro, Pouso Alegre - MG',
      ),
    );
  });

  it('campo preenchido: oferece "Usar este" sem apagar o que foi digitado', async () => {
    const { geocodificador } = await montar();
    geocodificador.enderecoDoPonto = 'Rua Juruá – Centro, Pouso Alegre - MG';
    geocodificador.sugestoes = [];
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Praça da feira');

    await marcarNoMapa(-22.23, -45.93);

    await waitFor(() => expect(screen.getByTestId('usar-endereco-do-ponto')).toHaveTextContent(/Rua Juruá/));
    expect(screen.getByTestId('campo-endereco-evento').props.value).toBe('Praça da feira');

    await fireEvent.press(screen.getByTestId('usar-endereco-do-ponto'));
    expect(screen.getByTestId('campo-endereco-evento').props.value).toBe(
      'Rua Juruá – Centro, Pouso Alegre - MG',
    );
  });
});
