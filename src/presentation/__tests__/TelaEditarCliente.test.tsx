import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEditarCliente from '../../../app/cliente/[id]';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarCliente', () => {
  it('pré-preenche nome e contato do cliente', () => {
    const seed = seedFixtures();
    render(<TelaEditarCliente cliente={seed.clientes[0]} onSalvar={async () => {}} />);

    expect(screen.getByTestId('campo-nome').props.value).toBe('Joao da Silva');
    expect(screen.getByTestId('campo-contato').props.value).toBe('(11) 99999-9999');
  });

  it('salva chamando onSalvar com os novos valores', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    render(
      <TelaEditarCliente
        cliente={seed.clientes[0]}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    fireEvent.changeText(screen.getByTestId('campo-nome'), 'Joao Editado');
    fireEvent.press(screen.getByTestId('botao-salvar-cliente'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({ nome: 'Joao Editado' }),
      ),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('erro do use case (ex. Cliente Avulso) aparece sem travar (UC19)', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {
      throw new Error('Cliente Avulso não pode ser editado');
    });
    render(<TelaEditarCliente cliente={seed.clientes[0]} onSalvar={onSalvar} />);

    fireEvent.press(screen.getByTestId('botao-salvar-cliente'));

    await waitFor(() => expect(screen.getByTestId('erro-cliente')).toBeTruthy());
    expect(onSalvar).toHaveBeenCalled();
  });
});
