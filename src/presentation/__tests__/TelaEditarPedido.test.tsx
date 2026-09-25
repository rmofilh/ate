import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarPedido from '../../../app/pedido/[id]/editar';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarPedido', () => {
  it('pré-preenche descrição do pedido', () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find((item) => item.status === 'A_FAZER')!;
    render(<TelaEditarPedido pedido={pedido} onSalvar={async () => {}} />);

    expect(screen.getByTestId('campo-descricao').props.value).toBe('Escultura de Onca');
  });

  it('salva chamando onSalvar com descrição e data', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find((item) => item.status === 'A_FAZER')!;
    const onSalvar = jest.fn(
      async (_args: { descricao: string; dataEntrega: Date }) => {},
    );
    const onConcluido = jest.fn();
    render(
      <TelaEditarPedido
        pedido={pedido}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Onca com base');
    fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ descricao: 'Onca com base' }),
      ),
    );
    const chamada = onSalvar.mock.calls[0][0] as { dataEntrega: unknown };
    expect(chamada.dataEntrega).toBeInstanceOf(Date);
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('erro do use case (ex. pedido fora de A_FAZER) aparece sem travar (UC20)', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find((item) => item.status === 'A_FAZER')!;
    const onSalvar = jest.fn(async () => {
      throw new Error('editar() válido somente em A_FAZER');
    });
    render(<TelaEditarPedido pedido={pedido} onSalvar={onSalvar} />);

    fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() => expect(screen.getByTestId('erro-pedido')).toBeTruthy());
  });
});
