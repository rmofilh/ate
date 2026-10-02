import { renderRouter, screen } from 'expo-router/testing-library';
import { act, fireEvent } from '@testing-library/react-native';
import { router, Slot } from 'expo-router';
import React from 'react';
import { SairButton } from '../components/SairButton';
import TelaEditarCliente from '../../app/cliente/[id]';
import { DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import RootLayout from '../../app/_layout';
import Index from '../../app/index';
import AuthLayout from '../../app/(auth)/_layout';
import Login from '../../app/(auth)/login';
import Kanban from '../../app/(tabs)/kanban';
// O Drawer real depende de reanimated animado (sem suporte no Jest):
// no teste de rotas ele é substituído por um stub que preserva
// a estrutura de navegação + logout.
function StubTabsLayout() {
  return (
    <>
      <Slot />
      <SairButton />
    </>
  );
}
import Estoque from '../../app/(tabs)/estoque';
import Eventos from '../../app/(tabs)/eventos';
import NovoPedido from '../../app/pedido/novo';
import NovoCliente from '../../app/cliente/novo';
import NovaObra from '../../app/obra/nova';
import NovoEvento from '../../app/evento/novo';
import EditarPedido from '../../app/pedido/[id]/editar';
import EditarEvento from '../../app/evento/[id]/editar';
import { Evento } from '../../core/domain/entities/Evento';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { gerarIdTeste } from '../../test-support/ids';

const routes = {
  _layout: RootLayout, index: Index,
  '(auth)/_layout': AuthLayout, '(auth)/login': Login,
  '(tabs)/_layout': StubTabsLayout, '(tabs)/kanban': () => <Kanban />,
  '(tabs)/estoque': () => <Estoque />, '(tabs)/eventos': () => <Eventos />,
  'pedido/novo': () => <NovoPedido />, 'cliente/novo': () => <NovoCliente />,
  'obra/nova': () => <NovaObra />, 'evento/novo': () => <NovoEvento />,
  'cliente/[id]': () => <TelaEditarCliente />,
  'pedido/[id]/editar': () => <EditarPedido />,
  'evento/[id]/editar': () => <EditarEvento />,
};

it('link direto ao Kanban sem login termina na rota pública', async () => {
  const app = renderRouter(routes, { initialUrl: '/kanban' });
  await app;
  await screen.findByText('Entrar no ate');
  expect(app.getPathname()).toBe('/login');
});

it('login libera as stacks e logout volta a proteger o histórico', async () => {
  const app = renderRouter(routes, { initialUrl: '/pedido/novo' });
  await app;
  expect(app.getPathname()).toBe('/login');
  await fireEvent.changeText(screen.getByTestId('campo-email'), 'artesao@email.com');
  await fireEvent.changeText(screen.getByTestId('campo-senha'), '123456');
  await fireEvent.press(screen.getByTestId('botao-entrar'));
  expect(await screen.findByText('Meus Pedidos')).toBeTruthy();
  expect(app.getPathname()).toBe('/kanban');
  await act(() => router.push('/pedido/novo'));
  expect(screen.getByTestId('scroll-novo-pedido')).toBeTruthy();
  await act(() => router.back());
  await fireEvent.press(screen.getByTestId('botao-sair'));
  expect(await screen.findByText('Entrar no ate')).toBeTruthy();
  await act(() => router.push('/kanban'));
  expect(app.getPathname()).toBe('/login');
});

it('troca parâmetro da rota de cliente sem exibir o cliente anterior', async () => {
  const seed = seedFixtures();
  await renderRouter({
    'cliente/[id]': () => (
      <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
        <TelaEditarCliente onSalvar={async () => {}} />
      </DataContext.Provider>
    ),
  }, { initialUrl: `/cliente/${seed.clientes[0].id}` });
  expect(screen.getByTestId('campo-nome').props.value).toBe(seed.clientes[0].nome);
  await act(() => router.setParams({ id: seed.clientes[1].id }));
  expect(screen.getByTestId('campo-nome').props.value).toBe(seed.clientes[1].nome);
  await act(() => router.push('/cliente/00000000-0000-4000-8000-000000000000'));
  expect(await screen.findByText('Cliente não encontrado')).toBeTruthy();
  expect(screen.queryByTestId('campo-nome')).toBeNull();
});

it('troca ID do pedido em foco e reinicializa os campos', async () => {
  const seed = seedFixtures();
  await renderRouter({
    'pedido/[id]/editar': () => (
      <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
        <EditarPedido onSalvar={async () => {}} />
      </DataContext.Provider>
    ),
  }, { initialUrl: `/pedido/${seed.pedidos[0].id}/editar` });
  expect(screen.getByTestId('campo-descricao').props.value).toBe(seed.pedidos[0].descricao);
  await act(() => router.setParams({ id: seed.pedidos[1].id }));
  expect(screen.getByTestId('campo-descricao').props.value).toBe(seed.pedidos[1].descricao);
});

it('troca ID do evento em foco e reinicializa os campos', async () => {
  const seed = seedFixtures();
  const segundo = Evento.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId,
    nome: 'Outra Feira', data: new Date('2026-12-20'), endereco: 'Rua Dois',
    localizacao: new Coordenada(0, 0) });
  await renderRouter({
    'evento/[id]/editar': () => (
      <DataContext.Provider value={{ ...seed, eventos: [...seed.eventos, segundo], reload: async () => {} }}>
        <EditarEvento onSalvar={async () => {}} />
      </DataContext.Provider>
    ),
  }, { initialUrl: `/evento/${seed.eventos[0].id}/editar` });
  expect(screen.getByTestId('campo-nome-evento').props.value).toBe(seed.eventos[0].nome);
  await act(() => router.setParams({ id: segundo.id }));
  expect(screen.getByTestId('campo-nome-evento').props.value).toBe(segundo.nome);
});
