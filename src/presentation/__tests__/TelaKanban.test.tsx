import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaKanban from '../../app/(tabs)/kanban';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { AppProviders, AuthContext, DataContext } from '../hooks/AppProviders';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';

describe('TelaKanban', () => {
  it('exibe 3 colunas com cards das fixtures', async () => {
    const seed = seedFixtures();
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={async () => {}}
          onCancelar={async () => {}}
        />
      </DataContext.Provider>,
    );

    expect(screen.getByTestId('coluna-a-fazer')).toBeTruthy();
    expect(screen.getByTestId('coluna-fazendo')).toBeTruthy();
    expect(screen.getByTestId('coluna-feito')).toBeTruthy();
    expect(screen.getAllByTestId(/pedido-/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByTestId('scroll-kanban')).toBeTruthy();
  });

  it('cancelar câmera mantém FAZENDO com aviso (UC05 FA1)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find((pedido) => pedido.status === 'FAZENDO')!;
    const onConcluir = jest.fn(async () => {
      throw new Error('Foto obrigatória para concluir o pedido.');
    });
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={onConcluir}
          onCancelar={async () => {}}
          pedidoAlvo={fazendo.id}
        />
      </DataContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId(`mover-${fazendo.id}-feito`));

    await waitFor(() =>
      expect(screen.getByTestId('aviso-foto-obrigatoria')).toBeTruthy(),
    );
  });

  it('cancelar pedido pede confirmação antes de chamar onCancelar (UC21)', async () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={async () => {}}
          onCancelar={onCancelar}
        />
      </DataContext.Provider>,
    );
    const id = seed.pedidos[0].id;

    await fireEvent.press(screen.getByTestId(`cancelar-${id}`));

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    expect(onCancelar).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(onCancelar).toHaveBeenCalledWith(id));
  });

  it('abortar o diálogo não chama onCancelar', async () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={async () => {}}
          onCancelar={onCancelar}
        />
      </DataContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId(`cancelar-${seed.pedidos[0].id}`));
    await fireEvent.press(screen.getByTestId('dialog-cancel'));

    expect(onCancelar).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog-confirm')).toBeNull();
  });

  it('botão sair chama logout (UC02/RF02)', async () => {
    const seed = seedFixtures();
    const logout = jest.fn(async () => {});
    await render(
      <AuthContext.Provider
        value={{
          session: { userId: seed.usuarioId, token: 'fake' },
          login: async () => {},
          logout,
        }}
      >
        <DataContext.Provider
          value={{
            pedidos: seed.pedidos,
            obras: seed.obras,
            eventos: [],
            clientes: seed.clientes,
            reload: async () => {},
          }}
        >
          <TelaKanban
            onIniciar={async () => {}}
            onConcluir={async () => {}}
            onCancelar={async () => {}}
          />
        </DataContext.Provider>
      </AuthContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('botao-sair'));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });

  it('permissão negada exibe a instrução do gateway (RNF12)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find((pedido) => pedido.status === 'FAZENDO')!;
    const onConcluir = jest.fn(async () => {
      throw new Error(
        'Permissão de câmera negada - habilite nas configurações do dispositivo',
      );
    });
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={onConcluir}
          onCancelar={async () => {}}
        />
      </DataContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId(`mover-${fazendo.id}-feito`));

    await waitFor(() =>
      expect(screen.getByTestId('aviso-foto-obrigatoria').props.children).toMatch(
        /configurações/,
      ),
    );
  });

  it('desabilita o botão durante o salvamento e ignora toque duplo', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find((pedido) => pedido.status === 'FAZENDO')!;
    let liberar!: () => void;
    const onConcluir = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          liberar = resolve;
        }),
    );
    await render(
      <DataContext.Provider
        value={{
          pedidos: seed.pedidos,
          obras: seed.obras,
          eventos: [],
          clientes: seed.clientes,
          reload: async () => {},
        }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={onConcluir}
          onCancelar={async () => {}}
        />
      </DataContext.Provider>,
    );
    const botao = screen.getByTestId(`mover-${fazendo.id}-feito`);

    await fireEvent.press(botao);
    await fireEvent.press(botao);

    await waitFor(() => expect(screen.getByText('Salvando...')).toBeTruthy());
    expect(onConcluir).toHaveBeenCalledTimes(1);

    await act(async () => {
      liberar();
    });
    await waitFor(() => expect(screen.queryByText('Salvando...')).toBeNull());
  });

  it('coluna vazia mostra estado guiado (Review Focus)', async () => {
    await render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaKanban
          onIniciar={async () => {}}
          onConcluir={async () => {}}
          onCancelar={async () => {}}
        />
      </DataContext.Provider>,
    );

    expect(screen.getAllByText('Nenhum pedido aqui — toque em Novo Pedido')).toHaveLength(3);
  });

  it('câmera cancelada não conclui pedido nem altera a fila', async () => {
    const providers = makeFakeProviders();
    const pedido = providers.pedidos.find((item) => item.status === 'FAZENDO')!;
    providers.gateways.camera.mode = 'cancel';
    const capturar = jest.spyOn(providers.gateways.camera, 'capture');
    await render(<AppProviders providers={providers}><TelaKanban /></AppProviders>);
    await fireEvent.press(screen.getByTestId(`mover-${pedido.id}-feito`));
    expect(screen.getByTestId('aviso-foto-obrigatoria')).toHaveTextContent(/foto obrigatória/i);
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(providers.gateways.sync.queue).toEqual([]);
    expect((await providers.repositories.pedidos.findById(pedido.id))?.status).toBe('FAZENDO');
  });
});
