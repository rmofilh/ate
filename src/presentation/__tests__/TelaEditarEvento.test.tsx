import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarEvento from '../../app/evento/[id]/editar';
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

  it('GPS fica desabilitado com aviso e coordenadas manuais atualizam o ponto', async () => {
    const seed = seedFixtures();
    await render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onSalvar={async () => {}}
      />,
    );

    expect(screen.getByTestId('botao-usar-gps').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('aviso-gps')).toHaveTextContent(/manualmente/);

    await fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '1');
    await fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '2');
    await fireEvent.press(screen.getByTestId('usar-localizacao-manual'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());
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
