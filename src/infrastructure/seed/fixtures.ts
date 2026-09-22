import { Cliente } from '../../core/domain/entities/Cliente';
import { Evento } from '../../core/domain/entities/Evento';
import { Obra } from '../../core/domain/entities/Obra';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export function seedFixtures() {
  const usuarioId = 'a1111111-1111-4111-8111-111111111111';
  const clienteJoao = Cliente.criar({
    usuarioId,
    nome: 'Joao da Silva',
    contato: '(11) 99999-9999',
  });
  const clienteBalcao = Cliente.balcao(usuarioId);
  const obraAguia = Obra.criar({
    usuarioId,
    nome: 'Aguia de Asas Abertas',
    tipo: 'UNICA',
  });
  obraAguia.reservar();
  const obraCoruja = Obra.criar({
    usuarioId,
    nome: 'Coruja Pequena',
    tipo: 'SERIE',
    quantidade: 4,
    fotoPath: '/tmp/coruja.jpg',
  });
  const pedidoAFazer = Pedido.criar({
    usuarioId,
    clienteId: clienteJoao.id,
    descricao: 'Escultura de Onca',
    canalOrigem: 'INSTAGRAM',
    dataEntrega: new Date('2026-11-01'),
  });
  const pedido101 = Pedido.criar({
    usuarioId,
    clienteId: clienteJoao.id,
    descricao: 'Escultura de Aguia personalizada',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-10-05'),
    obraId: obraAguia.id,
  });
  pedido101.moverParaFazendo();
  const pedidoFeito = Pedido.criarVendaDireta({
    usuarioId,
    clienteId: clienteBalcao.id,
    obraId: obraCoruja.id,
    quantidade: 1,
    descricao: 'Coruja de prateleira (pronta entrega)',
    canalOrigem: 'PRESENCIAL',
  });
  const evento = Evento.criar({
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
