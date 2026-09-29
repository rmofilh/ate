import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../../app/_layout';
import Index from '../../app/index';
import AuthLayout from '../../app/(auth)/_layout';
import Login from '../../app/(auth)/login';
import TabsLayout from '../../app/(tabs)/_layout';
import Kanban from '../../app/(tabs)/kanban';

it('link direto ao Kanban sem login termina na rota pública', async () => {
  const app = renderRouter({
    _layout: RootLayout, index: Index,
    '(auth)/_layout': AuthLayout, '(auth)/login': Login,
    '(tabs)/_layout': TabsLayout, '(tabs)/kanban': () => <Kanban />,
  }, { initialUrl: '/kanban' });
  await app;
  await screen.findByText('Entrar no ate');
  expect(app.getPathname()).toBe('/login');
});
