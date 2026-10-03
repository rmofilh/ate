import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Dimensions, ScrollView } from 'react-native';

import TelaKanban from '../../app/(tabs)/kanban';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { DataContext } from '../hooks/AppProviders';

async function board(fontScale = 1) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 812, scale: 1, fontScale });
  const seed = seedFixtures();
  const onConcluir = jest.fn(async () => {});
  await render(<DataContext.Provider value={{ ...seed, reload: async () => {} }}>
    <TelaKanban onConcluir={onConcluir} />
  </DataContext.Provider>);
  await fireEvent(screen.getByTestId('kanban-quadro'), 'layout', { nativeEvent: { layout: { width: 335 } } });
  return { seed, onConcluir };
}

describe('apresentação do quadro', () => {
  afterEach(() => jest.restoreAllMocks());

  it('âncoras centralizam a coluna escolhida e respeitam movimento reduzido', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const scroll = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await board();
    await fireEvent.press(screen.getByTestId('ancora-FAZENDO'));
    expect(screen.getByTestId('ancora-FAZENDO').props.accessibilityState.selected).toBe(true);
    expect(scroll).toHaveBeenLastCalledWith({ x: expect.any(Number), animated: false });
    expect(scroll.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ x: expect.closeTo(300.1, 1) }));
  });

  it('deslizamento manual atualiza a âncora destacada', async () => {
    await board();
    await fireEvent.scroll(screen.getByTestId('quadro-deslizante'), { nativeEvent: { contentOffset: { x: 600.2, y: 0 } } });
    expect(screen.getByTestId('ancora-FEITO').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('ancora-A_FAZER').props.accessibilityState.selected).toBe(false);
  });

  it('visão geral reúne todos os pedidos e retorna à etapa escolhida sem executar ações', async () => {
    const { seed, onConcluir } = await board();
    await fireEvent.press(screen.getByTestId('alternar-visao-kanban'));
    expect(screen.getByTestId('kanban-visao-geral')).toBeTruthy();
    expect(screen.getAllByTestId(/^resumo-pedido-/)).toHaveLength(seed.pedidos.length);
    expect(screen.queryByTestId('quadro-deslizante')).toBeNull();
    await fireEvent.press(screen.getByTestId('abrir-resumo-FAZENDO'));
    expect(screen.queryByTestId('kanban-visao-geral')).toBeNull();
    expect(screen.getByTestId('ancora-FAZENDO').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('quadro-deslizante')).toBeTruthy();
    expect(onConcluir).not.toHaveBeenCalled();
  });

  it('mudanças de largura preservam a etapa atual', async () => {
    const scroll = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await board();
    await fireEvent.press(screen.getByTestId('ancora-FEITO'));
    await fireEvent(screen.getByTestId('kanban-quadro'), 'layout', { nativeEvent: { layout: { width: 1000 } } });
    await waitFor(() => expect(scroll).toHaveBeenLastCalledWith({ x: 0, animated: false }));
    expect(screen.getByTestId('ancora-FEITO').props.accessibilityState.selected).toBe(true);
    await fireEvent(screen.getByTestId('kanban-quadro'), 'layout', { nativeEvent: { layout: { width: 335 } } });
    await waitFor(() => expect(scroll.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ x: expect.closeTo(600.2, 1) })));
  });

  it('texto ampliado mantém controles nomeados e a coluna dentro da largura disponível', async () => {
    const scroll = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await board(3.2);
    expect(screen.getByRole('button', { name: 'Novo Pedido' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver visão geral' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ancora-FAZENDO'));
    expect(screen.getByTestId('ancora-FAZENDO').props.accessibilityState.selected).toBe(true);
    // A full-width column (335) plus the 12pt gutter, not an oversized column requiring two-axis reading.
    expect(scroll.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ x: expect.closeTo(347, 1) }));
    await fireEvent.press(screen.getByTestId('alternar-visao-kanban'));
    expect(screen.getByTestId('kanban-visao-geral')).toBeTruthy();
  });
});
