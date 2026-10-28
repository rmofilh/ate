import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEventos from '../../app/(tabs)/eventos';
import TelaNovoEvento from '../../app/evento/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { FakeGeocodingGateway } from '../../infrastructure/device/FakeGeocodingGateway';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { mensagemDaPagina } from '../../test-support/mocks/reactNativeWebview';
import type { ProviderBag } from '../../main/factories/ProviderBag';
import { DataContext, NetworkContext, ServicesContext } from '../hooks/AppProviders';

const pinNoMapa = (latitude: number, longitude: number) =>
  fireEvent(screen.getByTestId('mapa'), 'message', mensagemDaPagina({ tipo: 'pin', latitude, longitude }));
const textoDoPin = () => screen.getByTestId('coordenada-do-pin');

describe('TelaEventos', () => {
  it('lista eventos e pins das fixtures mesmo offline', async () => {
    const seed = seedFixtures();
    await render(
      <NetworkContext.Provider value={{ isOnline: false, setOnline: () => {} }}>
        <DataContext.Provider
          value={{ pedidos: [], obras: [], eventos: seed.eventos, clientes: [], reload: async () => {} }}
        >
          <TelaEventos onNovo={() => {}} onRemover={async () => {}} />
        </DataContext.Provider>
      </NetworkContext.Provider>,
    );

    expect(screen.getAllByTestId(/evento-/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId(/pin-/)).toHaveLength(seed.eventos.length);
    expect(screen.getByTestId('banner-offline')).toBeTruthy();
    expect(screen.getByText(/12\/10\/2026/)).toBeTruthy();
    expect(screen.getByTestId('scroll-eventos')).toBeTruthy();
  });

  it('remover pede confirmação antes de chamar onRemover', async () => {
    const seed = seedFixtures();
    const onRemover = jest.fn(async () => {});
    await render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: seed.eventos, clientes: [], reload: async () => {} }}
      >
        <TelaEventos onNovo={() => {}} onRemover={onRemover} />
      </DataContext.Provider>,
    );
    const id = seed.eventos[0].id;

    await fireEvent.press(screen.getByTestId(`remover-${id}`));

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    expect(onRemover).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(onRemover).toHaveBeenCalledWith(id));
  });

  it('sem eventos mostra estado guiado (Review Focus)', async () => {
    await render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEventos onNovo={() => {}} onRemover={async () => {}} />
      </DataContext.Provider>,
    );

    expect(screen.getByText('Nenhum evento — toque em Novo Evento')).toBeTruthy();
  });

  it('Novo Evento salva todos os campos com coordenadas manuais', async () => {
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    await render(
      <TelaNovoEvento
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Nova');
    await fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-10');
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Central, 10');
    await fireEvent.changeText(screen.getByTestId('campo-obs-evento'), 'Levar estoque');
    await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '-23.5');
    await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '-46.6');
    await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Feira Nova',
          endereco: 'Rua Central, 10',
          observacoes: 'Levar estoque',
          data: expect.any(Date),
          localizacao: expect.objectContaining({ latitude: -23.5, longitude: -46.6 }),
        }),
      ),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('Novo Evento: endereço → Localizar no mapa → pin no endereço → confirmar → salva esse ponto', async () => {
    const onSalvar = jest.fn(async () => {});
    const onBuscarEndereco = jest.fn(async () => new Coordenada(-23.5614, -46.6558));
    await render(<TelaNovoEvento onSalvar={onSalvar} onBuscarEndereco={onBuscarEndereco} />);

    expect(screen.queryByTestId('botao-usar-gps')).toBeNull();
    expect(screen.queryByTestId('aviso-gps')).toBeNull();
    expect(onBuscarEndereco).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mapa')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira da Vila');
    await fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Praça Benedito Calixto');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(onBuscarEndereco).toHaveBeenCalledWith('Praça Benedito Calixto');
    expect(await screen.findByTestId('mapa')).toBeTruthy();
    expect(textoDoPin()).toHaveTextContent('Pin: -23.5614, -46.6558');

    await pinNoMapa(-23.5611, -46.6822);
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));

    await waitFor(() => expect(screen.queryByTestId('mapa')).toBeNull());
    expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/-23.5611, -46.6822/);
    expect(screen.getByTestId('campo-latitude-manual').props.value).toBe('-23.5611');
    expect(screen.getByTestId('campo-longitude-manual').props.value).toBe('-46.6822');

    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          localizacao: expect.objectContaining({ latitude: -23.5611, longitude: -46.6822 }),
        }),
      ),
    );
  });

  it('Novo Evento: endereço não encontrado abre o mapa sem pin e com aviso', async () => {
    const onBuscarEndereco = jest.fn(async () => null);
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua que não existe');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(await screen.findByTestId('aviso-seletor')).toHaveTextContent(/endereço não encontrado/i);
    expect(textoDoPin()).toHaveTextContent('Nenhum ponto escolhido');

    await pinNoMapa(-23.4, -46.5);
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/-23.4, -46.5/));
  });

  it('Novo Evento: busca indisponível (sem internet) abre o mapa com a mensagem', async () => {
    const onBuscarEndereco = () => new FakeGeocodingGateway(null, 'BUSCA_INDISPONIVEL').buscar('x');
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Augusta');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(await screen.findByTestId('aviso-seletor')).toHaveTextContent(/não foi possível buscar o endereço/i);
    expect(screen.getByTestId('mapa')).toBeTruthy();
  });

  it('Novo Evento: falha desconhecida da busca abre o mapa com mensagem genérica', async () => {
    const onBuscarEndereco = jest.fn(async (): Promise<Coordenada | null> => {
      throw new Error('falha nativa');
    });
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Augusta');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(await screen.findByTestId('aviso-seletor')).toHaveTextContent(/posicione o pin/i);
  });

  it('Novo Evento: sem endereço abre o mapa direto, sem buscar', async () => {
    const onBuscarEndereco = jest.fn(async () => new Coordenada(1, 1));
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(await screen.findByTestId('mapa')).toBeTruthy();
    expect(onBuscarEndereco).not.toHaveBeenCalled();
    expect(textoDoPin()).toHaveTextContent('Nenhum ponto escolhido');
  });

  it('Novo Evento: cancelar o mapa não altera o ponto', async () => {
    const onBuscarEndereco = jest.fn(async () => new Coordenada(5, 5));
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua A');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    await fireEvent.press(await screen.findByTestId('botao-cancelar-local'));

    await waitFor(() => expect(screen.queryByTestId('mapa')).toBeNull());
    expect(screen.queryByTestId('ponto-selecionado')).toBeNull();
  });

  it('Novo Evento: reabrir o mapa sem endereço começa no ponto já escolhido', async () => {
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={async () => null} />);

    await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '-23.4');
    await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '-46.5');
    await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));

    expect(await screen.findByTestId('mapa')).toBeTruthy();
    expect(textoDoPin()).toHaveTextContent('Pin: -23.4, -46.5');
  });

  it('Novo Evento: "Minha localização" dentro do mapa usa o GPS e confirma o ponto', async () => {
    const onGps = jest.fn(() => new FakeLocationGateway(new Coordenada(-22.9, -43.2)).getCurrent());
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={async () => null} onGps={onGps} />);

    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    await fireEvent.press(await screen.findByTestId('botao-minha-localizacao'));
    await waitFor(() => expect(textoDoPin()).toHaveTextContent('Pin: -22.9, -43.2'));
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/-22.9, -43.2/));
    expect(onGps).toHaveBeenCalledTimes(1);
  });

  it('Novo Evento: toque duplo em Localizar no mapa faz uma única busca', async () => {
    let responder: (c: Coordenada | null) => void = () => {};
    const onBuscarEndereco = jest.fn(() => new Promise<Coordenada | null>((resolve) => (responder = resolve)));
    await render(<TelaNovoEvento onSalvar={async () => {}} onBuscarEndereco={onBuscarEndereco} />);

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua A');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    expect(screen.getByTestId('botao-localizar-mapa')).toHaveTextContent('Buscando endereço...');

    await act(async () => responder(new Coordenada(1, 2)));

    expect(onBuscarEndereco).toHaveBeenCalledTimes(1);
  });

  it('Novo Evento usa a busca e o GPS dos serviços quando não recebe as props', async () => {
    const buscar = jest.fn(async () => new Coordenada(3, 4));
    const getCurrent = jest.fn(async () => new Coordenada(5, 6));
    const services = {
      gateways: { location: { getCurrent }, geocodificador: { buscar } },
    } as unknown as ProviderBag;
    await render(
      <ServicesContext.Provider value={services}>
        <TelaNovoEvento onSalvar={async () => {}} />
      </ServicesContext.Provider>,
    );

    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua B');
    await fireEvent.press(screen.getByTestId('botao-localizar-mapa'));
    expect(await screen.findByTestId('mapa')).toBeTruthy();
    expect(textoDoPin()).toHaveTextContent('Pin: 3, 4');
    expect(buscar).toHaveBeenCalledWith('Rua B');

    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));
    await waitFor(() =>
      expect(textoDoPin()).toHaveTextContent('Pin: 5, 6'),
    );
    expect(getCurrent).toHaveBeenCalledTimes(1);
  });

  it('Novo Evento não salva sem campos e localização obrigatórios', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovoEvento
        onSalvar={onSalvar}
      />,
    );

    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('Novo Evento não converte coordenadas manuais vazias em zero', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovoEvento onSalvar={onSalvar} />);

    await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Manual');
    await fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Manual');
    await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));
    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

it('Novo Evento aceita coordenadas manuais zero', async () => {
  const onSalvar = jest.fn(async () => {});
  await render(<TelaNovoEvento onSalvar={onSalvar} />);
  await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Equador');
  await fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
  await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Um');
  await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '0');
  await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '0');
  await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));
  await fireEvent.press(screen.getByTestId('botao-salvar-evento'));
  expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({
    localizacao: expect.objectContaining({ latitude: 0, longitude: 0 }),
  }));
});
