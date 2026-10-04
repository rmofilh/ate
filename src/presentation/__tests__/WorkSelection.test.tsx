import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import TelaNovoPedido from '../../app/pedido/novo';
import TelaKanban from '../../app/(tabs)/kanban';
import { Pedido } from '../../core/domain/entities/Pedido';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { gerarIdTeste } from '../../test-support/ids';
import { AppProviders, DataContext } from '../hooks/AppProviders';

async function setup() {
  const seed = seedFixtures();
  const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
  const avulso = seed.clientes.find((cliente) => cliente.contato === '')!;
  const save = jest.fn(async () => {});
  await render(<TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={save} />);
  await fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Descrição preservada');
  await fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-12-15');
  await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
  await fireEvent.press(screen.getByTestId(`escolher-cliente-${avulso.id}`));
  await fireEvent.press(screen.getByTestId('escolher-canal-WHATSAPP'));
  return { seed, serie, avulso, save };
}

async function selectWork(id: string) {
  await fireEvent.press(screen.getByTestId('selecionar-obra-estoque'));
  await fireEvent.press(screen.getByTestId(`escolher-obra-${id}`));
}

describe('obra opcional do novo pedido', () => {
  it('mostra um resumo enxuto e permite remover a escolha sem limpar o formulário', async () => {
    const { serie, avulso, save } = await setup();
    const quantity = serie.quantidade;
    await selectWork(serie.id);
    expect(screen.getByTestId('detalhe-obra-selecionada')).toHaveTextContent(/1 unidade neste pedido/);
    expect(screen.queryByText('Ao salvar, o estoque disponível diminui em 1 unidade.')).toBeNull();
    expect(serie.quantidade).toBe(quantity);
    await fireEvent.press(screen.getByTestId('remover-selecao-obra'));
    expect(screen.getByTestId('obra-sem-selecao')).toBeTruthy();
    expect(screen.getByTestId('campo-descricao').props.value).toBe('Descrição preservada');
    expect(screen.getByTestId('campo-data-entrega').props.value).toBe('2026-12-15');
    expect(screen.getByTestId('escolher-canal-WHATSAPP').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ clienteId: avulso.id, obraId: null }));
    expect(serie.quantidade).toBe(quantity);
  });

  it('tocar novamente na obra selecionada desfaz a escolha no seletor ou no resumo', async () => {
    const { serie } = await setup();
    await selectWork(serie.id);
    await selectWork(serie.id);
    expect(screen.queryByTestId('obra-selecionada')).toBeNull();
    await selectWork(serie.id);
    await fireEvent.press(screen.getByTestId('obra-selecionada'));
    expect(screen.queryByTestId('obra-selecionada')).toBeNull();
    expect(screen.getByTestId('obra-sem-selecao')).toBeTruthy();
  });

  it('cancelar a busca preserva a escolha e exclui obras reservadas dos resultados', async () => {
    const { seed, serie } = await setup();
    await selectWork(serie.id);
    await fireEvent.press(screen.getByTestId('selecionar-obra-estoque'));
    expect(screen.queryByText(seed.obras.find((obra) => obra.statusObra === 'RESERVADA')!.nome)).toBeNull();
    await fireEvent.changeText(screen.getByTestId('escolher-obra-busca'), 'coruja');
    expect(screen.getByTestId(`escolher-obra-${serie.id}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('escolher-obra-fechar'));
    expect(screen.getByTestId('obra-selecionada')).toHaveTextContent(serie.nome);
  });

  it('escolher e remover a obra não chama cadastro, não baixa estoque e não enfileira sync', async () => {
    const providers = makeFakeProviders();
    const serie = providers.obras.find((obra) => obra.tipo === 'SERIE')!;
    const quantity = serie.quantidade;
    const create = jest.spyOn(providers.useCases.cadastrarPedido, 'execute');
    await render(<AppProviders providers={providers}><TelaNovoPedido /></AppProviders>);
    await selectWork(serie.id);
    await fireEvent.press(screen.getByTestId('remover-selecao-obra'));
    expect(create).not.toHaveBeenCalled();
    expect(serie.quantidade).toBe(quantity);
    expect(providers.gateways.sync.queue).toEqual([]);
  });
});

describe('identificação da obra no Kanban', () => {
  it('mostra nome, tipo e unidade nas três etapas mantendo a descrição do pedido', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
    const novo = Pedido.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, clienteId: seed.clientes[0].id,
      descricao: 'Descrição personalizada', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-12-15'), obraId: serie.id });
    const pedidos = [...seed.pedidos.filter((pedido) => pedido.status !== 'A_FAZER'), novo];
    await render(<DataContext.Provider value={{ ...seed, pedidos, reload: async () => {} }}><TelaKanban /></DataContext.Provider>);
    for (const pedido of pedidos) {
      const obra = seed.obras.find((item) => item.id === pedido.obraId)!;
      const link = screen.getByTestId(`vinculo-obra-${pedido.id}`);
      expect(within(link).getByText(obra.nome)).toBeTruthy();
      expect(link).toHaveTextContent(/1 unidade/);
      expect(within(screen.getByTestId(`pedido-${pedido.id}`)).getByText(pedido.descricao)).toBeTruthy();
    }
  });

  it('preserva a indicação de vínculo mesmo sem o nome no catálogo atual', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find((item) => item.status === 'FAZENDO')!;
    await render(<DataContext.Provider value={{ ...seed, pedidos: [pedido], obras: [], reload: async () => {} }}>
      <TelaKanban />
    </DataContext.Provider>);
    expect(screen.getByTestId(`vinculo-obra-${pedido.id}`)).toHaveTextContent(/Obra vinculada/);
    expect(screen.getByText('Obra do estoque')).toBeTruthy();
  });
});
