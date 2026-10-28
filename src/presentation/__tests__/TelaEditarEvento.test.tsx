import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarEvento from '../../app/evento/[id]/editar';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarEvento', () => {
  it('pré-preenche campos e exibe o pin atual', async () => {
    const seed = seedFixtures();
    await render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onSalvar={async () => {}}
      />,
    );

    expect(screen.getByTestId('campo-nome-evento').props.value).toBe('Feira da Praca');
    expect(screen.getByTestId('pin-atual')).toBeTruthy();
  });

  it('coordenadas manuais atualizam o ponto e não há mais aviso de GPS indisponível', async () => {
    const seed = seedFixtures();
    await render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onSalvar={async () => {}}
      />,
    );

    expect(screen.queryByTestId('aviso-gps')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '1');
    await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '2');
    await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());
  });

  it('Atualizar localização pelo GPS troca o pin e salva o novo ponto', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    const onGps = jest.fn(() => new FakeLocationGateway(new Coordenada(-22.9, -43.2)).getCurrent());
    await render(<TelaEditarEvento evento={seed.eventos[0]} onSalvar={onSalvar} onGps={onGps} />);

    expect(onGps).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() =>
      expect(screen.getByTestId('ponto-selecionado')).toHaveTextContent(/-22.9, -43.2/),
    );
    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          localizacao: expect.objectContaining({ latitude: -22.9, longitude: -43.2 }),
        }),
      ),
    );
  });

  it('GPS negado na edição mantém o pin atual e salva sem trocar a coordenada', async () => {
    const seed = seedFixtures();
    const evento = seed.eventos[0];
    const onSalvar = jest.fn(async () => {});
    const onGps = () => new FakeLocationGateway(undefined, 'NEGADA_PERMANENTE').getCurrent();
    await render(<TelaEditarEvento evento={evento} onSalvar={onSalvar} onGps={onGps} />);

    await fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() => expect(screen.getByTestId('erro-gps')).toHaveTextContent(/configurações/i));
    expect(screen.getByTestId('botao-abrir-configuracoes')).toBeTruthy();
    expect(screen.queryByTestId('ponto-selecionado')).toBeNull();

    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ localizacao: evento.localizacao }),
      ),
    );
  });

  it('salva chamando onSalvar com os novos valores', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    await render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Nova');
    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Feira Nova' })),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('exibe erro do use case sem travar', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {
      throw new Error('Não foi possível editar o evento');
    });
    await render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onSalvar={onSalvar}
      />,
    );

    await fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
  });
});
