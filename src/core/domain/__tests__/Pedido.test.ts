import { Pedido } from '../entities/Pedido';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const clienteId = 'b2222222-2222-4222-8222-222222222222';

function novoPedido() {
  return Pedido.criar({
    usuarioId,
    clienteId,
    descricao: 'Águia personalizada',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-10-01'),
  });
}

describe('Pedido criar + mover', () => {
  it('nasce A_FAZER sem foto e sem venda direta', () => {
    const p = novoPedido();
    expect(p.status).toBe('A_FAZER');
    expect(p.fotoConclusaoPath).toBeNull();
    expect(p.vendaDireta).toBe(false);
  });

  it('rejeita descrição só-espaços e data inválida (Review Focus)', () => {
    expect(() =>
      Pedido.criar({
        usuarioId,
        clienteId,
        descricao: '   ',
        canalOrigem: 'WHATSAPP',
        dataEntrega: new Date('2026-10-01'),
      }),
    ).toThrow(/descri/i);
    expect(() =>
      Pedido.criar({
        usuarioId,
        clienteId,
        descricao: 'ok',
        canalOrigem: 'WHATSAPP',
        dataEntrega: new Date('invalida'),
      }),
    ).toThrow(/data/i);
  });

  it('moverParaFazendo só de A_FAZER', () => {
    const p = novoPedido();
    p.moverParaFazendo();
    expect(p.status).toBe('FAZENDO');
    expect(() => p.moverParaFazendo()).toThrow();
  });

  it('protege dataEntrega contra mutações externas', () => {
    const dataEntrega = new Date('2026-10-01');
    const p = Pedido.criar({
      usuarioId,
      clienteId,
      descricao: 'Pedido',
      canalOrigem: 'WHATSAPP',
      dataEntrega,
    });

    dataEntrega.setTime(NaN);
    expect(p.dataEntrega.toISOString()).toBe('2026-10-01T00:00:00.000Z');

    const dataExposta = p.dataEntrega;
    dataExposta.setTime(NaN);
    expect(p.dataEntrega.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('Pedido concluir (foto rígida)', () => {
  it('exige foto não-nula/não-vazia e status FAZENDO', () => {
    const p = novoPedido();
    expect(() => p.concluir('/tmp/foto.jpg')).toThrow();
    p.moverParaFazendo();
    expect(() => p.concluir(null)).toThrow(/foto/i);
    expect(() => p.concluir('   ')).toThrow(/foto/i);
    p.concluir('/tmp/foto.jpg');
    expect(p.status).toBe('FEITO');
  });
});

describe('Pedido editar/vincular/cancelar', () => {
  it('editar só em A_FAZER', () => {
    const p = novoPedido();
    p.editar('Nova desc', new Date('2026-11-01'));
    expect(p.descricao).toBe('Nova desc');
    p.moverParaFazendo();
    expect(() => p.editar('x', new Date('2026-11-01'))).toThrow();
  });

  it('vincularObra só em A_FAZER e uma única vez', () => {
    const p = novoPedido();
    p.vincularObra('d5555555-5555-4555-8555-555555555555');
    expect(p.obraId).toBe('d5555555-5555-4555-8555-555555555555');
    expect(() => p.vincularObra('outra')).toThrow();
  });

  it('cancelar preenche deletedAt; transição após delete lança (Review Focus)', () => {
    const p = novoPedido();
    p.cancelar();
    expect(p.deletedAt).toBeInstanceOf(Date);
    expect(() => p.moverParaFazendo()).toThrow(/removido/i);
    expect(() => p.editar('x', new Date())).toThrow();
  });

  it('criarVendaDireta nasce FEITO com vendaDireta=true sem exigir foto', () => {
    const v = Pedido.criarVendaDireta({
      usuarioId,
      clienteId,
      obraId: 'd6666666-6666-4666-8666-666666666666',
      descricao: 'Coruja pronta entrega',
      canalOrigem: 'PRESENCIAL',
    });
    expect(v.status).toBe('FEITO');
    expect(v.vendaDireta).toBe(true);
    expect(() =>
      Pedido.criarVendaDireta({
        usuarioId,
        clienteId,
        obraId: '',
        descricao: 'x',
        canalOrigem: 'PRESENCIAL',
      }),
    ).toThrow();
  });
});
