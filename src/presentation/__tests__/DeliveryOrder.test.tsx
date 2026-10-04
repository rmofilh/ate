import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import TelaKanban from '../../app/(tabs)/kanban';
import { Pedido } from '../../core/domain/entities/Pedido';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { gerarIdTeste } from '../../test-support/ids';
import { DataContext } from '../hooks/AppProviders';
import { sortPedidosByDelivery } from '../utils/sortPedidosByDelivery';

function order(description: string, date: string) {
  const seed = seedFixtures();
  return Pedido.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, clienteId: seed.clientes[0].id,
    descricao: description, canalOrigem: 'OUTROS', dataEntrega: new Date(date) });
}

describe('ordem visual por entrega', () => {
  it('ordena dias vencidos e próximos primeiro sem alterar a coleção ou os pedidos', () => {
    const later = order('Mais distante', '2026-12-15');
    const overdue = order('Prazo vencido', '2026-09-01');
    const next = order('Próxima entrega', '2026-10-05');
    const source = Object.freeze([later, overdue, next]);
    const dates = source.map((pedido) => pedido.dataEntrega.toISOString());

    expect(sortPedidosByDelivery(source)).toEqual([overdue, next, later]);
    expect(source).toEqual([later, overdue, next]);
    expect(source.map((pedido) => pedido.dataEntrega.toISOString())).toEqual(dates);
    expect(source.every((pedido) => pedido.status === 'A_FAZER')).toBe(true);
  });

  it('mantém a ordem original em um mesmo dia, ignorando diferenças de horário', () => {
    const noon = order('Primeiro do mesmo dia', '2026-10-05T12:00:00Z');
    const midnight = order('Segundo do mesmo dia', '2026-10-05T00:00:00Z');
    const earlier = order('Dia anterior', '2026-10-04T12:00:00Z');
    expect(sortPedidosByDelivery([noon, midnight, earlier])).toEqual([earlier, noon, midnight]);
  });

  it('usa o dia canônico exibido pela UI, mesmo quando a data contém um offset', () => {
    const later = order('Dia UTC posterior', '2026-10-05T23:30:00-03:00');
    const earlier = order('Dia UTC anterior', '2026-10-06T00:30:00+14:00');
    expect(sortPedidosByDelivery([later, earlier])).toEqual([earlier, later]);
  });

  it('quadro detalhado e visão geral exibem a mesma ordem sem executar operações', async () => {
    const seed = seedFixtures();
    const later = order('Entrega distante', '2026-12-15');
    const earlier = order('Entrega próxima', '2026-10-05');
    const source = [later, earlier];
    const onIniciar = jest.fn(async () => {});
    const onConcluir = jest.fn(async () => {});
    const onCancelar = jest.fn(async () => {});
    await render(<DataContext.Provider value={{ ...seed, pedidos: source, reload: async () => {} }}>
      <TelaKanban onIniciar={onIniciar} onConcluir={onConcluir} onCancelar={onCancelar} />
    </DataContext.Provider>);
    expect(within(screen.getByTestId('coluna-a-fazer')).getAllByTestId(/^pedido-/).map((item) => item.props.testID))
      .toEqual([`pedido-${earlier.id}`, `pedido-${later.id}`]);
    await fireEvent.press(screen.getByTestId('alternar-visao-kanban'));
    expect(within(screen.getByTestId('resumo-coluna-a-fazer')).getAllByTestId(/^resumo-pedido-/).map((item) => item.props.testID))
      .toEqual([`resumo-pedido-${earlier.id}`, `resumo-pedido-${later.id}`]);
    expect(source).toEqual([later, earlier]);
    expect(onIniciar).not.toHaveBeenCalled();
    expect(onConcluir).not.toHaveBeenCalled();
    expect(onCancelar).not.toHaveBeenCalled();
  });
});
