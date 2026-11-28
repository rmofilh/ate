import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TelaClientes from '../../app/(tabs)/clientes';
import { Cliente } from '../../core/domain/entities/Cliente';
import { Pedido } from '../../core/domain/entities/Pedido';
import { gerarIdTeste } from '../../test-support/ids';
import { DataContext, NavigationContext, type NavigationCtx } from '../hooks/AppProviders';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const cliente = (nome: string, contato = '(31) 9000-0000') =>
  Cliente.criar({ id: gerarIdTeste(), usuarioId: USUARIO, nome, contato });
const pedidoDe = (clienteId: string) =>
  Pedido.criar({
    id: gerarIdTeste(),
    usuarioId: USUARIO,
    clienteId,
    descricao: 'Coruja',
    canalOrigem: 'INSTAGRAM',
    dataEntrega: new Date('2099-01-01T12:00:00.000Z'),
  });

function navegacao(): NavigationCtx {
  return {
    novoPedido: jest.fn(),
    novoCliente: jest.fn(),
    novaObra: jest.fn(),
    novoEvento: jest.fn(),
    editarCliente: jest.fn(),
    editarPedido: jest.fn(),
    editarEvento: jest.fn(),
    voltar: jest.fn(),
  };
}

async function montar(clientes: Cliente[], pedidos: Pedido[] = []) {
  const navigation = navegacao();
  await render(
    <NavigationContext.Provider value={navigation}>
      <DataContext.Provider value={{ pedidos, obras: [], eventos: [], clientes, reload: async () => {} }}>
        <TelaClientes />
      </DataContext.Provider>
    </NavigationContext.Provider>,
  );
  return navigation;
}

describe('TelaClientes', () => {
  it('lista em ordem alfabética, sem o Cliente Avulso, com os pedidos em aberto', async () => {
    const bia = cliente('Bia');
    const ana = cliente('Ana');
    const balcao = Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO });
    await montar([bia, balcao, ana], [pedidoDe(ana.id), pedidoDe(ana.id)]);

    const nomes = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string).filter(Boolean)
      .filter((rotulo) => rotulo.includes('Toque para editar'));
    expect(nomes.map((rotulo) => rotulo.split(',')[0])).toEqual(['Ana', 'Bia']);
    expect(screen.queryByText('Cliente Avulso')).toBeNull();
    expect(screen.getByTestId(`pedidos-cliente-${ana.id}`)).toHaveTextContent('2 pedidos em aberto');
    expect(screen.getByTestId(`pedidos-cliente-${bia.id}`)).toHaveTextContent('Nenhum pedido em aberto');
  });

  it('tocar no cliente abre a edição; "Novo" abre o cadastro', async () => {
    const ana = cliente('Ana');
    const navigation = await montar([ana]);

    await fireEvent.press(screen.getByTestId(`cliente-${ana.id}`));
    await fireEvent.press(screen.getByTestId('novo-cliente'));

    expect(navigation.editarCliente).toHaveBeenCalledWith(ana.id);
    expect(navigation.novoCliente).toHaveBeenCalledTimes(1);
  });

  it('sem clientes mostra o estado vazio', async () => {
    await montar([Cliente.balcao({ id: gerarIdTeste(), usuarioId: USUARIO })]);
    expect(screen.getByTestId('clientes-vazio')).toBeTruthy();
  });
});
