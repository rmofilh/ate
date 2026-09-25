import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEventos from '../../../app/(tabs)/eventos';
import TelaNovoEvento from '../../../app/evento/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { DataContext, NetworkContext } from '../hooks/AppProviders';

describe('TelaEventos', () => {
  it('lista eventos e pins das fixtures mesmo offline', () => {
    const seed = seedFixtures();
    render(
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
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: seed.eventos, clientes: [], reload: async () => {} }}
      >
        <TelaEventos onNovo={() => {}} onRemover={onRemover} />
      </DataContext.Provider>,
    );
    const id = seed.eventos[0].id;

    fireEvent.press(screen.getByTestId(`remover-${id}`));

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    expect(onRemover).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(onRemover).toHaveBeenCalledWith(id));
  });

  it('sem eventos mostra estado guiado (Review Focus)', () => {
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEventos onNovo={() => {}} onRemover={async () => {}} />
      </DataContext.Provider>,
    );

    expect(screen.getByText('Nenhum evento — toque em Novo Evento')).toBeTruthy();
  });

  it('Novo Evento usa GPS e salva todos os campos', async () => {
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    render(
      <TelaNovoEvento
        onGps={async () => ({ latitude: -23.5, longitude: -46.6 })}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Nova');
    fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-10');
    fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Central, 10');
    fireEvent.changeText(screen.getByTestId('campo-obs-evento'), 'Levar estoque');
    fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

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

  it('Novo Evento orienta quando a permissão de localização é negada (RNF12)', async () => {
    const onSalvar = jest.fn(async () => {});
    render(
      <TelaNovoEvento
        onGps={async () => {
          throw new Error('Permissão negada');
        }}
        onSalvar={onSalvar}
      />,
    );

    fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() =>
      expect(screen.getByTestId('erro-evento').props.children).toMatch(/configurações/),
    );

    fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Manual');
    fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
    fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Manual');
    fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '-23.4');
    fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '-46.5');
    fireEvent.press(screen.getByTestId('usar-localizacao-manual'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          localizacao: expect.objectContaining({ latitude: -23.4, longitude: -46.5 }),
        }),
      ),
    );
  });

  it('Novo Evento não salva sem campos e localização obrigatórios', async () => {
    const onSalvar = jest.fn(async () => {});
    render(
      <TelaNovoEvento
        onGps={async () => ({ latitude: 0, longitude: 0 })}
        onSalvar={onSalvar}
      />,
    );

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('Novo Evento não converte coordenadas manuais vazias em zero', async () => {
    const onSalvar = jest.fn(async () => {});
    render(<TelaNovoEvento onSalvar={onSalvar} />);

    fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Manual');
    fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
    fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Manual');
    fireEvent.press(screen.getByTestId('usar-localizacao-manual'));
    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
