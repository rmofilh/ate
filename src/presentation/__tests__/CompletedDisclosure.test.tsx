import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import TelaKanban from '../../app/(tabs)/kanban';
import { Pedido } from '../../core/domain/entities/Pedido';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { gerarIdTeste } from '../../test-support/ids';
import { AppProviders, DataContext } from '../hooks/AppProviders';

async function board() {
  const seed = seedFixtures();
  const second = Pedido.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, clienteId: seed.clientes[0].id,
    descricao: 'Segunda obra concluída', canalOrigem: 'OUTROS', dataEntrega: new Date('2026-12-15') });
  second.moverParaFazendo();
  second.concluir('/tmp/foto-segunda-obra.jpg');
  const done = [...seed.pedidos.filter((pedido) => pedido.status === 'FEITO'), second];
  const onCancelar = jest.fn(async () => {});
  await render(<DataContext.Provider value={{ ...seed, pedidos: [...seed.pedidos, second], reload: async () => {} }}>
    <TelaKanban onCancelar={onCancelar} />
  </DataContext.Provider>);
  return { seed, done, onCancelar };
}

describe('recolhimento dos concluídos', () => {
  it('recolhe um cartão ao nome da obra e recupera seus detalhes e ações ao expandir', async () => {
    const { seed, done, onCancelar } = await board();
    const pedido = done[0];
    const card = screen.getByTestId(`pedido-${pedido.id}`);
    expect(within(card).getByText(pedido.descricao)).toBeTruthy();
    expect(screen.getByTestId(`detalhes-feito-${pedido.id}`).props.accessibilityState.expanded).toBe(true);

    await fireEvent.press(screen.getByTestId(`detalhes-feito-${pedido.id}`));
    expect(screen.getByTestId(`detalhes-feito-${pedido.id}`).props.accessibilityState.expanded).toBe(false);
    expect(within(card).getByText(seed.obras.find((obra) => obra.id === pedido.obraId)!.nome)).toBeTruthy();
    expect(screen.queryByTestId(`cancelar-${pedido.id}`)).toBeNull();
    expect(within(card).queryByText('Venda direta')).toBeNull();
    expect(pedido.status).toBe('FEITO');
    expect(pedido.deletedAt).toBeNull();
    expect(screen.queryByTestId('dialog-confirm')).toBeNull();

    await fireEvent.press(screen.getByTestId(`detalhes-feito-${pedido.id}`));
    expect(within(card).getByText(pedido.descricao)).toBeTruthy();
    expect(screen.getByTestId(`cancelar-${pedido.id}`)).toBeTruthy();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it('recolhe todos, permite abrir um e mantém a contagem de concluídos', async () => {
    const { done } = await board();
    await fireEvent.press(screen.getByTestId('alternar-detalhes-feito'));
    for (const pedido of done) expect(screen.getByTestId(`detalhes-feito-${pedido.id}`).props.accessibilityState.expanded).toBe(false);
    expect(screen.getByTestId('coluna-feito').props.accessibilityLabel).toBe('Coluna Feito, 2 pedidos');

    await fireEvent.press(screen.getByTestId(`detalhes-feito-${done[0].id}`));
    expect(screen.getByTestId(`detalhes-feito-${done[0].id}`).props.accessibilityState.expanded).toBe(true);
    expect(screen.getByTestId(`detalhes-feito-${done[1].id}`).props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(screen.getByTestId('alternar-detalhes-feito'));
    await fireEvent.press(screen.getByTestId('alternar-detalhes-feito'));
    for (const pedido of done) expect(screen.getByTestId(`detalhes-feito-${pedido.id}`).props.accessibilityState.expanded).toBe(true);
  });

  it('preserva os cartões recolhidos durante trocas de etapa e de visualização', async () => {
    const { done } = await board();
    await fireEvent.press(screen.getByTestId('alternar-detalhes-feito'));
    await fireEvent.press(screen.getByTestId('ancora-FAZENDO'));
    await fireEvent.press(screen.getByTestId('alternar-visao-kanban'));
    expect(screen.getByTestId('kanban-visao-geral')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('abrir-resumo-FEITO'));
    for (const pedido of done) expect(screen.getByTestId(`detalhes-feito-${pedido.id}`).props.accessibilityState.expanded).toBe(false);
  });

  it('não captura foto, cancela, altera estoque ou enfileira sincronização', async () => {
    const providers = makeFakeProviders();
    const pedido = providers.pedidos.find((item) => item.status === 'FEITO')!;
    const capture = jest.spyOn(providers.gateways.camera, 'capture');
    const cancel = jest.spyOn(providers.useCases.cancelarPedido, 'execute');
    const complete = jest.spyOn(providers.useCases.concluirPedido, 'execute');
    const quantities = providers.obras.map((obra) => obra.quantidade);
    await render(<AppProviders providers={providers}><TelaKanban /></AppProviders>);
    await fireEvent.press(screen.getByTestId('alternar-detalhes-feito'));
    await fireEvent.press(screen.getByTestId(`detalhes-feito-${pedido.id}`));
    expect(capture).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(providers.obras.map((obra) => obra.quantidade)).toEqual(quantities);
    expect(providers.gateways.sync.queue).toEqual([]);
    expect(pedido.status).toBe('FEITO');
    expect(pedido.deletedAt).toBeNull();
  });
});
