import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TelaEstoque from '../../app/(tabs)/estoque';
import TelaEventos from '../../app/(tabs)/eventos';
import TelaKanban from '../../app/(tabs)/kanban';
import TelaNovoPedido from '../../app/pedido/novo';
import TelaNovoCliente from '../../app/cliente/novo';
import { Cliente } from '../../core/domain/entities/Cliente';
import { Pedido } from '../../core/domain/entities/Pedido';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { gerarIdTeste } from '../../test-support/ids';
import {
  AppProviders,
  DataContext,
  NavigationContext,
} from '../hooks/AppProviders';

function makeNavigation() {
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

describe('ações de navegação', () => {
  it('Kanban abre novo pedido e edições com o id correto', async () => {
    const seed = seedFixtures();
    const navigation = makeNavigation();
    const pedido = seed.pedidos.find((item) => item.status === 'A_FAZER')!;
    await render(
      <NavigationContext.Provider value={navigation}>
        <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
          <TelaKanban
            onIniciar={async () => {}}
            onConcluir={async () => {}}
            onCancelar={async () => {}}
          />
        </DataContext.Provider>
      </NavigationContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('novo-pedido'));
    await fireEvent.press(screen.getByTestId(`editar-pedido-${pedido.id}`));
    await fireEvent.press(screen.getByTestId(`editar-cliente-${pedido.id}`));

    expect(navigation.novoPedido).toHaveBeenCalledTimes(1);
    expect(navigation.editarPedido).toHaveBeenCalledWith(pedido.id);
    expect(navigation.editarCliente).toHaveBeenCalledWith(pedido.clienteId);
  });

  it('permite editar cliente comum chamado Cliente Avulso', async () => {
    const seed = seedFixtures();
    const navigation = makeNavigation();
    const cliente = Cliente.criar({
      id: gerarIdTeste(),
      usuarioId: seed.usuarioId,
      nome: 'Cliente Avulso',
      contato: '(11) 97777-6666',
    });
    const pedido = Pedido.criar({
      id: gerarIdTeste(),
      usuarioId: seed.usuarioId,
      clienteId: cliente.id,
      descricao: 'Pedido do cliente homônimo',
      canalOrigem: 'TELEFONE',
      dataEntrega: new Date('2026-12-15'),
    });
    await render(
      <NavigationContext.Provider value={navigation}>
        <DataContext.Provider
          value={{
            pedidos: [pedido],
            obras: [],
            eventos: [],
            clientes: [cliente],
            reload: async () => {},
          }}
        >
          <TelaKanban
            onIniciar={async () => {}}
            onConcluir={async () => {}}
            onCancelar={async () => {}}
          />
        </DataContext.Provider>
      </NavigationContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId(`editar-cliente-${pedido.id}`));

    expect(navigation.editarCliente).toHaveBeenCalledWith(cliente.id);
  });

  it('Estoque e Eventos expõem criar e editar', async () => {
    const seed = seedFixtures();
    const navigation = makeNavigation();
    await render(
      <NavigationContext.Provider value={navigation}>
        <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
          <TelaEstoque
            onVenda={async () => {}}
            onAdicionar={async () => {}}
            onRemoverUnidades={async () => {}}
            onRemoverObra={async () => {}}
          />
          <TelaEventos onRemover={async () => {}} />
        </DataContext.Provider>
      </NavigationContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('nova-obra'));
    await fireEvent.press(screen.getByTestId('novo-evento'));
    await fireEvent.press(screen.getByTestId(`editar-evento-${seed.eventos[0].id}`));

    expect(navigation.novaObra).toHaveBeenCalledTimes(1);
    expect(navigation.novoEvento).toHaveBeenCalledTimes(1);
    expect(navigation.editarEvento).toHaveBeenCalledWith(seed.eventos[0].id);
  });

  it('Novo Pedido oferece cadastrar cliente', async () => {
    const seed = seedFixtures();
    const navigation = makeNavigation();
    await render(
      <NavigationContext.Provider value={navigation}>
        <TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={async () => {}} />
      </NavigationContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.press(screen.getByTestId('novo-cliente'));

    expect(navigation.novoCliente).toHaveBeenCalledTimes(1);
  });

  it('UC09 volta ao pedido com o novo cliente selecionado', async () => {
    const providers = makeFakeProviders();

    function Flow() {
      const [route, setRoute] = React.useState<'pedido' | 'cliente'>('pedido');
      const navigation = {
        ...makeNavigation(),
        novoCliente: () => setRoute('cliente'),
        voltar: () => setRoute('pedido'),
      };

      return (
        <NavigationContext.Provider value={navigation}>
          {route === 'pedido' ? <TelaNovoPedido /> : <TelaNovoCliente />}
        </NavigationContext.Provider>
      );
    }

    await render(
      <AppProviders providers={providers}>
        <Flow />
      </AppProviders>,
    );

    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.press(screen.getByTestId('novo-cliente'));
    await fireEvent.changeText(screen.getByTestId('campo-nome'), 'Maria Souza');
    await fireEvent.changeText(screen.getByTestId('campo-contato'), '(11) 98888-7777');
    await fireEvent.press(screen.getByTestId('botao-salvar-cliente'));

    expect(
      await screen.findByText('Maria Souza'),
    ).toBeTruthy();
  });
});
