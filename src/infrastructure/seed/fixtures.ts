import { Cliente } from '../../core/domain/entities/Cliente';
import { Evento } from '../../core/domain/entities/Evento';
import { Obra } from '../../core/domain/entities/Obra';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import { FakeIdGenerator } from '../device/FakeIdGenerator';

const demoIds = new FakeIdGenerator();

export function seedFixtures(gerador: IIdGenerator = demoIds) {
  const usuarioId = 'a1111111-1111-4111-8111-111111111111';
  const clienteJoao = Cliente.criar({
    id: gerador.gerar(),
    usuarioId,
    nome: 'Joao da Silva',
    contato: '(11) 99999-9999',
  });
  const clienteBalcao = Cliente.balcao({ id: gerador.gerar(), usuarioId });
  const obraAguia = Obra.criar({
    id: gerador.gerar(),
    usuarioId,
    nome: 'Aguia de Asas Abertas',
    tipo: 'UNICA',
  });
  obraAguia.reservar();
  const obraCoruja = Obra.criar({
    id: gerador.gerar(),
    usuarioId,
    nome: 'Coruja Pequena',
    tipo: 'SERIE',
    quantidade: 4,
    fotoPath: '/tmp/coruja.jpg',
  });
  const pedidoAFazer = Pedido.criar({
    id: gerador.gerar(),
    usuarioId,
    clienteId: clienteJoao.id,
    descricao: 'Escultura de Onca',
    canalOrigem: 'INSTAGRAM',
    dataEntrega: new Date('2026-11-01'),
  });
  const pedido101 = Pedido.criar({
    id: gerador.gerar(),
    usuarioId,
    clienteId: clienteJoao.id,
    descricao: 'Escultura de Aguia personalizada',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-10-05'),
    obraId: obraAguia.id,
  });
  pedido101.moverParaFazendo();
  const pedidoFeito = Pedido.criarVendaDireta({
    id: gerador.gerar(),
    usuarioId,
    clienteId: clienteBalcao.id,
    obraId: obraCoruja.id,
    quantidade: 1,
    descricao: 'Coruja de prateleira (pronta entrega)',
    canalOrigem: 'PRESENCIAL',
  });
  const evento = Evento.criar({
    id: gerador.gerar(),
    usuarioId,
    nome: 'Feira da Praca',
    data: new Date('2026-10-12'),
    endereco: 'Praca Central, banca 5',
    localizacao: new Coordenada(-23.5505, -46.6333),
    observacoes: 'Levar corujas',
  });

  return {
    usuarioId,
    clientes: [clienteJoao, clienteBalcao],
    obras: [obraAguia, obraCoruja],
    pedidos: [pedidoAFazer, pedido101, pedidoFeito],
    eventos: [evento],
  };
}
