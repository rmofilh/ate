import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TelaEstoque from '../../../app/(tabs)/estoque';
import TelaNovaObra from '../../../app/obra/nova';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { DataContext, NetworkContext } from '../hooks/AppProviders';

describe('TelaEstoque', () => {
  it('lista obras das fixtures com quantidade', () => {
    const seed = seedFixtures();
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEstoque
          onVenda={async () => {}}
          onAdicionar={async () => {}}
          onRemoverUnidades={async () => {}}
          onRemoverObra={async () => {}}
        />
      </DataContext.Provider>,
    );

    expect(screen.getAllByTestId(/obra-/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId(/qtd-/)).toHaveLength(seed.obras.length);
    expect(screen.getByTestId('scroll-estoque')).toBeTruthy();
  });

  it('venda direta confirma quantidade e ignora toque duplo (UC27)', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
    let liberar!: () => void;
    const onVenda = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          liberar = resolve;
        }),
    );
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEstoque
          onVenda={onVenda}
          onAdicionar={async () => {}}
          onRemoverUnidades={async () => {}}
          onRemoverObra={async () => {}}
        />
      </DataContext.Provider>,
    );

    fireEvent.press(screen.getByTestId(`venda-${serie.id}`));
    expect(screen.getByTestId('dialog-venda')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('campo-qtd-venda'), '2');

    const confirmar = screen.getByTestId('confirmar-venda');
    fireEvent.press(confirmar);
    fireEvent.press(confirmar);

    await waitFor(() => expect(onVenda).toHaveBeenCalledWith(serie.id, 2));
    expect(onVenda).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Salvando venda...')).toBeTruthy();

    await act(async () => {
      liberar();
    });
  });

  it('remover unidades exige quantidade e dupla confirmação (RF25)', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
    const onRemoverUnidades = jest.fn(async () => {});
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEstoque
          onVenda={async () => {}}
          onAdicionar={async () => {}}
          onRemoverUnidades={onRemoverUnidades}
          onRemoverObra={async () => {}}
        />
      </DataContext.Provider>,
    );

    fireEvent.press(screen.getByTestId(`remover-unidades-${serie.id}`));
    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('campo-qtd-remover'), '2');
    fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    expect(onRemoverUnidades).not.toHaveBeenCalled();
    expect(screen.getByTestId('dialog-confirm-dupla')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('campo-qtd-remover'), '3');

    fireEvent.press(screen.getByTestId('dialog-confirm-dupla'));

    await waitFor(() => expect(onRemoverUnidades).toHaveBeenCalledWith(serie.id, 2));
  });

  it('remoção bloqueada (RF22) exibe o erro sem travar', async () => {
    const seed = seedFixtures();
    const onRemoverObra = jest.fn(async () => {
      throw new Error('Obra vinculada a pedido aberto não pode ser removida');
    });
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEstoque
          onVenda={async () => {}}
          onAdicionar={async () => {}}
          onRemoverUnidades={async () => {}}
          onRemoverObra={onRemoverObra}
        />
      </DataContext.Provider>,
    );

    fireEvent.press(screen.getByTestId(`remover-obra-${seed.obras[0].id}`));
    fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(screen.getByTestId('erro-estoque')).toBeTruthy());
  });

  it('estoque vazio mostra estado guiado (Review Focus)', () => {
    render(
      <DataContext.Provider
        value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}
      >
        <TelaEstoque
          onVenda={async () => {}}
          onAdicionar={async () => {}}
          onRemoverUnidades={async () => {}}
          onRemoverObra={async () => {}}
        />
      </DataContext.Provider>,
    );

    expect(screen.getByText('Nenhuma obra — toque em Nova Obra')).toBeTruthy();
  });

  it('offline mostra banner e mantém ação local disponível', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
    const onAdicionar = jest.fn(async () => {});
    render(
      <NetworkContext.Provider value={{ isOnline: false, setOnline: () => {} }}>
        <DataContext.Provider
          value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}
        >
          <TelaEstoque
            onVenda={async () => {}}
            onAdicionar={onAdicionar}
            onRemoverUnidades={async () => {}}
            onRemoverObra={async () => {}}
          />
        </DataContext.Provider>
      </NetworkContext.Provider>,
    );

    expect(screen.getByTestId('banner-offline')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`add-${serie.id}`));

    await waitFor(() => expect(onAdicionar).toHaveBeenCalledWith(serie.id, 1));
  });

  it('Nova Obra salva série com quantidade positiva', async () => {
    const onSalvar = jest.fn(async () => {});
    const onConcluido = jest.fn();
    render(<TelaNovaObra onSalvar={onSalvar} onConcluido={onConcluido} />);

    fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Passaro pequeno');
    fireEvent.changeText(screen.getByTestId('campo-tipo-obra'), 'SERIE');
    fireEvent.changeText(screen.getByTestId('campo-qtd-obra'), '3');
    fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith({
        nome: 'Passaro pequeno',
        tipo: 'SERIE',
        quantidade: 3,
      }),
    );
    expect(onConcluido).toHaveBeenCalledTimes(1);
  });

  it('Nova Obra rejeita série sem quantidade positiva', async () => {
    const onSalvar = jest.fn(async () => {});
    render(<TelaNovaObra onSalvar={onSalvar} />);

    fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Passaro pequeno');
    fireEvent.changeText(screen.getByTestId('campo-tipo-obra'), 'SERIE');
    fireEvent.changeText(screen.getByTestId('campo-qtd-obra'), '0');
    fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    await waitFor(() => expect(screen.getByTestId('erro-obra')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
