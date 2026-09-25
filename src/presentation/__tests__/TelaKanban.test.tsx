import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaKanban from '../../../app/(tabs)/kanban';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { AuthContext, DataContext } from '../hooks/AppProviders';

describe('TelaKanban', () => {
  it('exibe 3 colunas com cards das fixtures', () => {
    const seed = seedFixtures();
    render(
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

    expect(screen.getByLabelText('coluna-a-fazer')).toBeTruthy();
    expect(screen.getByLabelText('coluna-fazendo')).toBeTruthy();
    expect(screen.getByLabelText('coluna-feito')).toBeTruthy();
    expect(screen.getAllByTestId(/pedido-/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByTestId('scroll-kanban')).toBeTruthy();
  });

  it('cancelar câmera mantém FAZENDO com aviso (UC05 FA1)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find((pedido) => pedido.status === 'FAZENDO')!;
    const onConcluir = jest.fn(async () => {
      throw new Error('Foto obrigatória para concluir o pedido.');
    });
    render(
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

    fireEvent.press(screen.getByTestId(`mover-${fazendo.id}-feito`));

    await waitFor(() =>
      expect(screen.getByTestId('aviso-foto-obrigatoria')).toBeTruthy(),
    );
  });

  it('cancelar pedido pede confirmação antes de chamar onCancelar (UC21)', async () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    render(
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

    fireEvent.press(screen.getByTestId(`cancelar-${id}`));

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    expect(onCancelar).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(onCancelar).toHaveBeenCalledWith(id));
  });

  it('abortar o diálogo não chama onCancelar', () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    render(
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

    fireEvent.press(screen.getByTestId(`cancelar-${seed.pedidos[0].id}`));
    fireEvent.press(screen.getByTestId('dialog-cancel'));

    expect(onCancelar).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog-confirm')).toBeNull();
  });

  it('botão sair chama logout (UC02/RF02)', async () => {
    const seed = seedFixtures();
    const logout = jest.fn(async () => {});
    render(
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

    fireEvent.press(screen.getByTestId('botao-sair'));

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
    render(
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

    fireEvent.press(screen.getByTestId(`mover-${fazendo.id}-feito`));

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
    render(
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

    fireEvent.press(botao);
    fireEvent.press(botao);

    await waitFor(() => expect(screen.getByText('Salvando...')).toBeTruthy());
    expect(onConcluir).toHaveBeenCalledTimes(1);

    await act(async () => {
      liberar();
    });
    await waitFor(() => expect(screen.queryByText('Salvando...')).toBeNull());
  });

  it('coluna vazia mostra estado guiado (Review Focus)', () => {
    render(
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
});
