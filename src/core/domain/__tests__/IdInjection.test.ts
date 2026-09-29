import { Cliente } from '../entities/Cliente';
import { Obra } from '../entities/Obra';
import { Pedido } from '../entities/Pedido';
import { Evento } from '../entities/Evento';
import { Coordenada } from '../value-objects/Coordenada';
import { gerarIdTeste } from '../../../test-support/ids';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const clienteId = 'b2222222-2222-4222-8222-222222222222';

it('mantém exatamente o UUID v4 fornecido nas quatro entidades', () => {
  const ids = Array.from({ length: 4 }, gerarIdTeste);
  const c = Cliente.criar({ id: ids[0], usuarioId, nome: 'João', contato: 'zap' });
  const o = Obra.criar({ id: ids[1], usuarioId, nome: 'Coruja', tipo: 'UNICA' });
  const p = Pedido.criar({ id: ids[2], usuarioId, clienteId: c.id,
    descricao: 'Encomenda', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-11-01') });
  const e = Evento.criar({ id: ids[3], usuarioId, nome: 'Feira',
    data: new Date('2026-11-01'), endereco: 'Rua Um', localizacao: new Coordenada(0, 0) });
  expect([c.id, o.id, p.id, e.id]).toEqual(ids);
});

it('rejeita ID vazio, v1 e não-UUID sem construir entidades', () => {
  expect(() => Cliente.criar({ id: '', usuarioId, nome: 'João', contato: 'zap' })).toThrow(/id.*uuid/i);
  expect(() => Obra.criar({ id: '00000000-0000-1000-8000-000000000001', usuarioId,
    nome: 'Coruja', tipo: 'UNICA' })).toThrow(/id.*uuid/i);
  expect(() => Pedido.criar({ id: 'xxx', usuarioId, clienteId, descricao: 'Peça',
    canalOrigem: 'OUTROS', dataEntrega: new Date('2026-11-01') })).toThrow(/id.*uuid/i);
  expect(() => Evento.criar({ id: '', usuarioId, nome: 'Feira',
    data: new Date('2026-11-01'), endereco: 'Rua Um', localizacao: new Coordenada(0, 0) })).toThrow(/id.*uuid/i);
});

it('aceita o ID externo também no Cliente Avulso e na venda direta', () => {
  const idBalcao = gerarIdTeste();
  const idVenda = gerarIdTeste();
  const obraId = gerarIdTeste();
  const balcao = Cliente.balcao({ id: idBalcao, usuarioId });
  const venda = Pedido.criarVendaDireta({ id: idVenda, usuarioId, clienteId: balcao.id,
    obraId, quantidade: 2, descricao: 'Coruja', canalOrigem: 'PRESENCIAL' });
  expect(balcao.id).toBe(idBalcao);
  expect(venda.id).toBe(idVenda);
  expect(() => Cliente.balcao({ id: '', usuarioId })).toThrow(/id.*uuid/i);
  expect(() => Pedido.criarVendaDireta({ id: '', usuarioId, clienteId: balcao.id,
    obraId, quantidade: 1, descricao: 'Coruja', canalOrigem: 'PRESENCIAL' })).toThrow(/id.*uuid/i);
});

it('exige id no contrato TypeScript', () => {
  // @ts-expect-error id é obrigatório na factory.
  const criarSemId = () => Cliente.criar({ usuarioId, nome: 'X', contato: 'zap' });
  expect(criarSemId).toBeInstanceOf(Function);
});
