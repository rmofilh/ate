import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaNovoPedido from '../../app/pedido/novo';
import TelaNovoCliente from '../../app/cliente/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaNovoPedido', () => {
  it('preenche e salva chamando onSalvar', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    await render(
      <TelaNovoPedido
        clientes={seed.clientes}
        obras={seed.obras}
        onSalvar={onSalvar}
        onConcluido={onConcluido}
      />,
    );

    await fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Onça de madeira');
    await fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-12-15');
    await fireEvent.press(screen.getByTestId('escolher-canal-WHATSAPP'));
    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          descricao: 'Onça de madeira',
          canalOrigem: 'WHATSAPP',
          dataEntrega: expect.any(Date),
        }),
      ),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('scroll-novo-pedido')).toBeTruthy();
  });

  it('descrição vazia mostra erro sem chamar onSalvar', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={onSalvar} />,
    );

    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() => expect(screen.getByTestId('erro-pedido')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('escolhe cliente e obra antes de salvar (UC08/UC10)', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={onSalvar} />,
    );
    const cliente = seed.clientes[0];
    const obraReservada = seed.obras.find((item) => item.statusObra === 'RESERVADA')!;
    const obra = seed.obras.find((item) => item.tipo === 'SERIE')!;

    await fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Peca com obra');
    await fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-12-20');
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${cliente.id}`));
    await fireEvent.press(screen.getByTestId('escolher-canal-PRESENCIAL'));

    expect(screen.queryByText(obraReservada.nome)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: obra.nome }));
    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: cliente.id,
          obraId: obra.id,
          canalOrigem: 'PRESENCIAL',
        }),
      ),
    );
  });

  it('cadastra cliente novo pelo fluxo estendido UC09', async () => {
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    await render(<TelaNovoCliente onSalvar={onSalvar} onConcluido={onConcluido} />);

    await fireEvent.changeText(screen.getByTestId('campo-nome'), 'Maria Souza');
    await fireEvent.changeText(screen.getByTestId('campo-contato'), '(11) 98888-7777');
    await fireEvent.press(screen.getByTestId('botao-salvar-cliente'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        nome: 'Maria Souza',
        contato: '(11) 98888-7777',
      }),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('não cadastra cliente sem nome e contato', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovoCliente onSalvar={onSalvar} />);

    await fireEvent.press(screen.getByTestId('botao-salvar-cliente'));

    await waitFor(() => expect(screen.getByTestId('erro-cliente')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

it('não registra pedido com data impossível ou cliente ausente', async () => {
  const onSalvar = jest.fn(async () => {});
  await render(<TelaNovoPedido clientes={[]} obras={[]} onSalvar={onSalvar} />);
  await fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Águia');
  await fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-02-31');
  await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));
  expect(screen.getByTestId('erro-pedido')).toBeTruthy();
  expect(onSalvar).not.toHaveBeenCalled();
});
