import React from 'react';
import { render, screen } from '@testing-library/react-native';

import TelaEditarCliente from '../../../app/cliente/[id]';
import TelaEditarEvento from '../../../app/evento/[id]/editar';
import TelaEditarPedido from '../../../app/pedido/[id]/editar';
import { Evento } from '../../core/domain/entities/Evento';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { DataContext, RouteParamsContext } from '../hooks/AppProviders';

describe('rotas dinâmicas de edição', () => {
  it('seleciona o cliente indicado pelo parâmetro id', () => {
    const seed = seedFixtures();
    const alvo = seed.clientes[1];
    render(
      <RouteParamsContext.Provider value={{ id: alvo.id }}>
        <DataContext.Provider
          value={{ ...seed, reload: async () => {} }}
        >
          <TelaEditarCliente onSalvar={async () => {}} />
        </DataContext.Provider>
      </RouteParamsContext.Provider>,
    );

    expect(screen.getByTestId('campo-nome').props.value).toBe('Cliente Avulso');
  });

  it('seleciona o pedido indicado pelo parâmetro id', () => {
    const seed = seedFixtures();
    const alvo = seed.pedidos[1];
    render(
      <RouteParamsContext.Provider value={{ id: alvo.id }}>
        <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
          <TelaEditarPedido onSalvar={async () => {}} />
        </DataContext.Provider>
      </RouteParamsContext.Provider>,
    );

    expect(screen.getByTestId('campo-descricao').props.value).toBe(
      'Escultura de Aguia personalizada',
    );
  });

  it('seleciona o evento indicado pelo parâmetro id', () => {
    const seed = seedFixtures();
    const alvo = Evento.criar({
      usuarioId: seed.usuarioId,
      nome: 'Feira Secundaria',
      data: new Date('2026-12-20'),
      endereco: 'Rua Dois',
      localizacao: new Coordenada(-22, -45),
    });
    render(
      <RouteParamsContext.Provider value={{ id: alvo.id }}>
        <DataContext.Provider
          value={{ ...seed, eventos: [...seed.eventos, alvo], reload: async () => {} }}
        >
          <TelaEditarEvento onGps={async () => ({ latitude: 0, longitude: 0 })} onSalvar={async () => {}} />
        </DataContext.Provider>
      </RouteParamsContext.Provider>,
    );

    expect(screen.getByTestId('campo-nome-evento').props.value).toBe('Feira Secundaria');
  });

  it('mostra não encontrado para id desconhecido', () => {
    const seed = seedFixtures();
    render(
      <RouteParamsContext.Provider value={{ id: '00000000-0000-4000-8000-000000000000' }}>
        <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
          <TelaEditarCliente onSalvar={async () => {}} />
        </DataContext.Provider>
      </RouteParamsContext.Provider>,
    );

    expect(screen.getByText('Cliente não encontrado')).toBeTruthy();
  });
});
