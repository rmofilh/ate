import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEventos from '../../app/(tabs)/eventos';
import TelaNovoEvento from '../../app/evento/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import type { MotivoLocalizacaoIndisponivel } from '../../core/application/errors/LocalizacaoIndisponivelError';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import type { ProviderBag } from '../../main/factories/ProviderBag';
import { DataContext, NetworkContext, ServicesContext } from '../hooks/AppProviders';

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

  it('Novo Evento preenche a coordenada pelo GPS, mostra antes de salvar e grava esse ponto', async () => {
    const onSalvar = jest.fn(async () => {});
    const onGps = jest.fn(() => new FakeLocationGateway(new Coordenada(-23.4, -46.5)).getCurrent());
    await render(<TelaNovoEvento onSalvar={onSalvar} onGps={onGps} />);

    expect(screen.queryByTestId('aviso-gps')).toBeNull();
    expect(onGps).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() =>
      expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/-23.4, -46.5/),
    );
    expect(screen.getByTestId('campo-latitude-manual').props.value).toBe('-23.4');
    expect(screen.getByTestId('campo-longitude-manual').props.value).toBe('-46.5');

    await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira GPS');
    await fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
    await fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua GPS');
    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          localizacao: expect.objectContaining({ latitude: -23.4, longitude: -46.5 }),
        }),
      ),
    );
  });

  it.each<[MotivoLocalizacaoIndisponivel, RegExp, boolean]>([
    ['NEGADA', /permissão de localização negada/i, false],
    ['NEGADA_PERMANENTE', /configurações/i, true],
    ['SERVICO_DESLIGADO', /ligue a localização/i, false],
    ['TIMEOUT', /não respondeu a tempo/i, false],
  ])(
    'Novo Evento com GPS %s mostra a instrução e mantém o fluxo manual',
    async (motivo, mensagem, ofereceConfiguracoes) => {
      const onSalvar = jest.fn(async () => {});
      const onGps = () => new FakeLocationGateway(undefined, motivo).getCurrent();
      await render(<TelaNovoEvento onSalvar={onSalvar} onGps={onGps} />);

      await fireEvent.press(screen.getByTestId('botao-usar-gps'));

      await waitFor(() => expect(screen.getByTestId('erro-gps')).toHaveTextContent(mensagem));
      expect(screen.queryByTestId('ponto-selecionado')).toBeNull();
      expect(screen.queryByTestId('botao-abrir-configuracoes') !== null).toBe(ofereceConfiguracoes);

      await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '-23.4');
      await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '-46.5');
      await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));

      await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());
      expect(screen.queryByTestId('erro-gps')).toBeNull();
    },
  );

  it('Novo Evento com GPS bloqueado abre as configurações do aparelho', async () => {
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const onGps = () => new FakeLocationGateway(undefined, 'NEGADA_PERMANENTE').getCurrent();
    await render(<TelaNovoEvento onSalvar={async () => {}} onGps={onGps} />);

    await fireEvent.press(screen.getByTestId('botao-usar-gps'));
    await fireEvent.press(await screen.findByTestId('botao-abrir-configuracoes'));

    expect(abrir).toHaveBeenCalledTimes(1);
    abrir.mockRestore();
  });

  it('Novo Evento com falha desconhecida do GPS mostra mensagem genérica', async () => {
    const onGps = jest.fn(async (): Promise<Coordenada> => {
      throw new Error('falha nativa');
    });
    await render(<TelaNovoEvento onSalvar={async () => {}} onGps={onGps} />);

    await fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() =>
      expect(screen.getByTestId('erro-gps')).toHaveTextContent(
        /não foi possível obter a localização/i,
      ),
    );
  });

  it('Novo Evento com toque duplo no GPS faz uma única leitura', async () => {
    let responder: (c: Coordenada) => void = () => {};
    const onGps = jest.fn(() => new Promise<Coordenada>((resolve) => (responder = resolve)));
    await render(<TelaNovoEvento onSalvar={async () => {}} onGps={onGps} />);

    await fireEvent.press(screen.getByTestId('botao-usar-gps'));
    await fireEvent.press(screen.getByTestId('botao-usar-gps'));
    expect(screen.getByTestId('botao-usar-gps')).toHaveTextContent('Buscando localização...');

    await act(async () => responder(new Coordenada(1, 2)));

    expect(onGps).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());
  });

  it('Novo Evento usa o gateway de localização dos serviços quando não recebe onGps', async () => {
    const getCurrent = jest.fn(async () => new Coordenada(3, 4));
    const services = { gateways: { location: { getCurrent } } } as unknown as ProviderBag;
    await render(
      <ServicesContext.Provider value={services}>
        <TelaNovoEvento onSalvar={async () => {}} />
      </ServicesContext.Provider>,
    );

    expect(getCurrent).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/3, 4/));
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
