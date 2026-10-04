import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import TabsLayout from '../../app/(tabs)/_layout';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { DataContext, NavigationContext } from '../hooks/AppProviders';

const mockCloseDrawer = jest.fn();

// Animation is external to these UI contracts; render the actual custom content.
jest.mock('expo-router/drawer', () => {
  const React = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');
  function Drawer({ drawerContent }: { drawerContent(props: { navigation: { closeDrawer(): void } }): React.ReactNode }) {
    return React.createElement(React.Fragment, null, drawerContent({ navigation: { closeDrawer: mockCloseDrawer } }));
  }
  Drawer.Screen = function DrawerScreen() { return null; };
  return { Drawer, DrawerContentScrollView: ScrollView, DrawerItemList: () => null };
});

describe('informativo e criação no drawer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('conta apenas A Fazer e Fazendo, inclusive quando todos os pedidos estão Feito', async () => {
    const seed = seedFixtures();
    const view = await render(<DataContext.Provider value={{ ...seed, reload: async () => {} }}><TabsLayout /></DataContext.Provider>);
    expect(screen.getByTestId('drawer-resumo-pedidos').props.accessibilityLabel).toBe('2 pedidos em aberto');
    expect(within(screen.getByTestId('drawer-resumo-pedidos')).getByText('2')).toBeTruthy();
    await view.rerender(<DataContext.Provider value={{ ...seed, pedidos: seed.pedidos.filter((pedido) => pedido.status === 'FEITO'), reload: async () => {} }}>
      <TabsLayout />
    </DataContext.Provider>);
    expect(screen.getByTestId('drawer-resumo-pedidos').props.accessibilityLabel).toBe('0 pedidos em aberto');
    expect(within(screen.getByTestId('drawer-resumo-pedidos')).getByText('0')).toBeTruthy();
  });

  it('fecha o drawer e abre o cadastro de cliente pela navegação existente', async () => {
    const create = jest.fn();
    await render(<NavigationContext.Provider value={{ novoCliente: create, novoPedido: () => {}, novaObra: () => {}, novoEvento: () => {},
      editarCliente: () => {}, editarPedido: () => {}, editarEvento: () => {}, voltar: () => {} }}>
      <TabsLayout />
    </NavigationContext.Provider>);
    await fireEvent.press(screen.getByTestId('drawer-novo-cliente'));
    expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(mockCloseDrawer.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
  });
});
