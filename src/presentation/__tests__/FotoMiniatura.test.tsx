import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Pedido, type PedidoProps } from '../../core/domain/entities/Pedido';
import { ArtworkThumbnail } from '../components/ArtworkThumbnail';
import { PedidoCard } from '../components/PedidoCard';
import { resolverUriDaFoto } from '../utils/fotos';

/** No Jest o expo-image entrega `source` como lista. */
function uriDaImagem(testID: string): string {
  return [screen.getByTestId(testID).props.source].flat()[0].uri;
}

function pedido(override: Partial<PedidoProps>): Pedido {
  return Pedido.reidratar({
    id: 'b2222222-2222-4222-8222-222222222222',
    usuarioId: 'a1111111-1111-4111-8111-111111111111',
    clienteId: 'c3333333-3333-4333-8333-333333333333',
    obraId: null,
    descricao: 'Vaso azul',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-11-10T12:00:00.000Z'),
    status: 'FEITO',
    fotoConclusaoPath: 'fotos/vaso.jpg',
    vendaDireta: false,
    quantidadeObra: 0,
    statusSync: 'PENDENTE',
    criadoEmLocal: new Date('2026-11-01T12:00:00.000Z'),
    deletedAt: null,
    ...override,
  });
}

const acoes = { onIniciar: jest.fn(), onConcluir: jest.fn(), onCancelar: jest.fn(), loading: false };

describe('resolverUriDaFoto', () => {
  it('resolve caminho relativo contra o diretório de documentos', () => {
    expect(resolverUriDaFoto('fotos/abc.jpg')).toBe('file:///docs/fotos/abc.jpg');
  });

  it('mantém caminho absoluto e URI como estão (fixtures e legado)', () => {
    expect(resolverUriDaFoto('/tmp/coruja.jpg')).toBe('/tmp/coruja.jpg');
    expect(resolverUriDaFoto('file:///cache/x.jpg')).toBe('file:///cache/x.jpg');
  });

  it('devolve null sem caminho', () => {
    expect(resolverUriDaFoto(null)).toBeNull();
    expect(resolverUriDaFoto(undefined)).toBeNull();
    expect(resolverUriDaFoto('')).toBeNull();
  });
});

describe('miniaturas', () => {
  it('ArtworkThumbnail exibe o caminho relativo resolvido', async () => {
    await render(<ArtworkThumbnail photoPath="fotos/obra.jpg" testID="miniatura" />);
    expect(uriDaImagem('miniatura')).toBe('file:///docs/fotos/obra.jpg');
  });

  it('ArtworkThumbnail sem foto mostra só o ícone', async () => {
    await render(<ArtworkThumbnail photoPath={null} testID="miniatura" />);
    expect(screen.queryByTestId('miniatura')).toBeNull();
  });

  it('PedidoCard Feito mostra a foto de conclusão', async () => {
    const feito = pedido({});
    await render(<PedidoCard pedido={feito} {...acoes} />);
    expect(uriDaImagem(`foto-conclusao-${feito.id}`)).toBe('file:///docs/fotos/vaso.jpg');
  });

  it('PedidoCard de venda direta (Feito sem foto) não mostra miniatura', async () => {
    const venda = pedido({ fotoConclusaoPath: null, vendaDireta: true });
    await render(<PedidoCard pedido={venda} {...acoes} />);
    expect(screen.queryByTestId(`foto-conclusao-${venda.id}`)).toBeNull();
  });

  it('PedidoCard Fazendo não mostra miniatura', async () => {
    const fazendo = pedido({ status: 'FAZENDO', fotoConclusaoPath: null });
    await render(<PedidoCard pedido={fazendo} {...acoes} />);
    expect(screen.queryByTestId(`foto-conclusao-${fazendo.id}`)).toBeNull();
  });
});
