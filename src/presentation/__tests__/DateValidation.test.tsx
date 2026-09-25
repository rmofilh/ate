import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarEvento from '../../../app/evento/[id]/editar';
import TelaEditarPedido from '../../../app/pedido/[id]/editar';
import TelaNovoEvento from '../../../app/evento/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('datas de calendário', () => {
  it('Novo Evento rejeita dia inexistente sem chamar o use case', async () => {
    const onSalvar = jest.fn(async () => {});
    render(
      <TelaNovoEvento
        onGps={async () => ({ latitude: 1, longitude: 2 })}
        onSalvar={onSalvar}
      />,
    );
    fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira');
    fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-02-31');
    fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Um');
    fireEvent.press(screen.getByTestId('botao-usar-gps'));
    await waitFor(() => expect(screen.getByTestId('ponto-selecionado')).toBeTruthy());

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('Editar Pedido rejeita dia inexistente sem chamar o use case', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find((item) => item.status === 'A_FAZER')!;
    const onSalvar = jest.fn(async (_args: { descricao: string; dataEntrega: Date }) => {});
    render(<TelaEditarPedido pedido={pedido} onSalvar={onSalvar} />);
    fireEvent.changeText(screen.getByTestId('campo-data'), '2026-02-31');

    fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() => expect(screen.getByTestId('erro-pedido')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('Editar Evento rejeita dia inexistente sem chamar o use case', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(
      <TelaEditarEvento
        evento={seed.eventos[0]}
        onGps={async () => ({ latitude: 1, longitude: 2 })}
        onSalvar={onSalvar}
      />,
    );
    fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-02-31');

    fireEvent.press(screen.getByTestId('botao-salvar-evento'));

    await waitFor(() => expect(screen.getByTestId('erro-evento')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
