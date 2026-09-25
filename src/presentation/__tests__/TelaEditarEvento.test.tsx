import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarEvento from '../../../app/evento/[id]/editar';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarEvento', () => {
  it('pré-preenche campos e exibe o pin atual', () => {
    const seed = seedFixtures();
    render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onGps={async () => ({ latitude: 0, longitude: 0 })}
        onSalvar={async () => {}}
      />,
    );

    expect(screen.getByTestId('campo-nome-evento').props.value).toBe('Feira da Praca');
    expect(screen.getByTestId('pin-atual')).toBeTruthy();
  });

  it('botão GPS atualiza o ponto exibido', async () => {
    const seed = seedFixtures();
    render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onGps={async () => ({ latitude: 1, longitude: 2 })}
        onSalvar={async () => {}}
      />,
    );

    fireEvent.press(screen.getByTestId('botao-usar-gps'));

    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());
  });

  it('salva chamando onSalvar com os novos valores', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onGps={async () => ({ latitude: 0, longitude: 0 })}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Nova');
    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

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
    render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onGps={async () => ({ latitude: 0, longitude: 0 })}
        onSalvar={onSalvar}
      />,
    );

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
  });
});
