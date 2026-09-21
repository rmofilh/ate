import { Cliente } from '../entities/Cliente';
import { Evento } from '../entities/Evento';
import { Obra } from '../entities/Obra';
import { Pedido } from '../entities/Pedido';
import { Coordenada } from '../value-objects/Coordenada';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const clienteId = 'b2222222-2222-4222-8222-222222222222';
const obraId = 'd5555555-5555-4555-8555-555555555555';

describe('identificadores UUID v4', () => {
  it.each([
    [
      'Cliente',
      () => Cliente.criar({ usuarioId: 'u1', nome: 'João', contato: 'x' }),
    ],
    [
      'Obra',
      () => Obra.criar({ usuarioId: 'u1', nome: 'Coruja', tipo: 'UNICA' }),
    ],
    [
      'Evento',
      () =>
        Evento.criar({
          usuarioId: 'u1',
          nome: 'Feira',
          data: new Date('2026-10-12'),
          endereco: 'Praça',
          localizacao: new Coordenada(0, 1),
        }),
    ],
  ])('%s rejeita usuarioId que não é UUID v4', (_entidade, criar) => {
    expect(criar).toThrow(/uuid/i);
  });

  it.each([
    [
      'usuarioId',
      () =>
        Pedido.criar({
          usuarioId: 'u1',
          clienteId,
          descricao: 'Pedido',
          canalOrigem: 'WHATSAPP',
          dataEntrega: new Date('2026-10-01'),
        }),
    ],
    [
      'clienteId',
      () =>
        Pedido.criar({
          usuarioId,
          clienteId: 'c1',
          descricao: 'Pedido',
          canalOrigem: 'WHATSAPP',
          dataEntrega: new Date('2026-10-01'),
        }),
    ],
    [
      'obraId opcional',
      () =>
        Pedido.criar({
          usuarioId,
          clienteId,
          obraId: '   ',
          descricao: 'Pedido',
          canalOrigem: 'WHATSAPP',
          dataEntrega: new Date('2026-10-01'),
        }),
    ],
  ])('Pedido.criar rejeita %s inválido', (_campo, criar) => {
    expect(criar).toThrow(/uuid/i);
  });

  it.each([
    ['usuarioId', { usuarioId: 'u1', clienteId, obraId }],
    ['clienteId', { usuarioId, clienteId: 'c1', obraId }],
    ['obraId', { usuarioId, clienteId, obraId: 'o1' }],
  ])('criarVendaDireta rejeita %s inválido', (_campo, ids) => {
    expect(() =>
      Pedido.criarVendaDireta({
        ...ids,
        descricao: 'Venda',
        canalOrigem: 'PRESENCIAL',
      }),
    ).toThrow(/uuid/i);
  });

  it('vincularObra rejeita obraId que não é UUID v4', () => {
    const pedido = Pedido.criar({
      usuarioId,
      clienteId,
      descricao: 'Pedido',
      canalOrigem: 'WHATSAPP',
      dataEntrega: new Date('2026-10-01'),
    });

    expect(() => pedido.vincularObra('obra')).toThrow(/uuid/i);
  });
});
