import { Cliente, type ClienteProps } from '../entities/Cliente';
import { Evento, type EventoProps } from '../entities/Evento';
import { Obra, type ObraProps } from '../entities/Obra';
import { Pedido, type PedidoProps } from '../entities/Pedido';
import {
  ClienteInvalidoError,
  CoordenadaInvalidaError,
  EventoInvalidoError,
  ObraInvalidaError,
  PedidoInvalidoError,
} from '../errors/DomainErrors';
import { Coordenada } from '../value-objects/Coordenada';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const ID = 'b2222222-2222-4222-8222-222222222222';
const OUTRO_ID = 'c3333333-3333-4333-8333-333333333333';
const CRIADO = new Date('2026-10-01T10:00:00.000Z');
const REMOVIDO = new Date('2026-10-20T15:30:00.000Z');

function getters(entidade: object, campos: string[]): Record<string, unknown> {
  return Object.fromEntries(campos.map((c) => [c, (entidade as Record<string, unknown>)[c]]));
}

describe('Cliente.reidratar', () => {
  const base: ClienteProps = {
    id: ID,
    usuarioId: USUARIO,
    nome: 'Ana',
    contato: '(11) 90000-0000',
    statusSync: 'SINCRONIZADO',
    criadoEmLocal: CRIADO,
    deletedAt: REMOVIDO,
  };

  it('devolve todos os campos, inclusive tombstone e statusSync', () => {
    const cliente = Cliente.reidratar(base);
    expect(getters(cliente, Object.keys(base))).toEqual(base);
  });

  it('aceita o cliente balcão com contato vazio e status ERRO', () => {
    const cliente = Cliente.reidratar({
      ...base,
      nome: 'Cliente Avulso',
      contato: '',
      statusSync: 'ERRO',
      deletedAt: null,
    });
    expect(cliente.contato).toBe('');
    expect(cliente.statusSync).toBe('ERRO');
    expect(cliente.deletedAt).toBeNull();
  });

  it.each([
    ['id não UUID v4', { id: 'x' }],
    ['usuarioId não UUID v4', { usuarioId: 'x' }],
    ['statusSync fora do enum', { statusSync: 'QUALQUER' }],
    ['criadoEmLocal inválida', { criadoEmLocal: new Date('x') }],
    ['deletedAt inválida', { deletedAt: new Date('x') }],
  ])('rejeita %s', (_, override) => {
    expect(() => Cliente.reidratar({ ...base, ...override } as ClienteProps)).toThrow(
      ClienteInvalidoError,
    );
  });

  it('não guarda referência às datas recebidas', () => {
    const criado = new Date(CRIADO.getTime());
    const cliente = Cliente.reidratar({ ...base, criadoEmLocal: criado });
    criado.setFullYear(2000);
    expect(cliente.criadoEmLocal.toISOString()).toBe(CRIADO.toISOString());
  });
});

describe('Obra.reidratar', () => {
  const base: ObraProps = {
    id: ID,
    usuarioId: USUARIO,
    nome: 'Coruja',
    tipo: 'SERIE',
    quantidade: 0,
    statusObra: 'DISPONIVEL',
    fotoPath: 'fotos/coruja.jpg',
    statusSync: 'SINCRONIZADO',
    criadoEmLocal: CRIADO,
    deletedAt: null,
  };

  it('devolve todos os campos', () => {
    const obra = Obra.reidratar(base);
    expect(getters(obra, Object.keys(base))).toEqual(base);
  });

  it('aceita estados que criar não produz (UNICA ARQUIVADA removida)', () => {
    const obra = Obra.reidratar({
      ...base,
      tipo: 'UNICA',
      quantidade: 1,
      statusObra: 'ARQUIVADA',
      fotoPath: null,
      deletedAt: REMOVIDO,
    });
    expect(obra.statusObra).toBe('ARQUIVADA');
    expect(obra.deletedAt).toEqual(REMOVIDO);
  });

  it.each([
    ['id não UUID v4', { id: 'x' }],
    ['tipo fora do enum', { tipo: 'MULTIPLA' }],
    ['statusObra fora do enum', { statusObra: 'VENDIDA' }],
    ['statusSync fora do enum', { statusSync: 'X' }],
    ['quantidade não inteira', { quantidade: 1.5 }],
    ['quantidade negativa', { quantidade: -1 }],
    ['criadoEmLocal inválida', { criadoEmLocal: new Date('x') }],
  ])('rejeita %s', (_, override) => {
    expect(() => Obra.reidratar({ ...base, ...override } as ObraProps)).toThrow(
      ObraInvalidaError,
    );
  });

  it('não guarda referência às datas recebidas', () => {
    const removido = new Date(REMOVIDO.getTime());
    const obra = Obra.reidratar({ ...base, deletedAt: removido });
    removido.setFullYear(2000);
    expect(obra.deletedAt?.toISOString()).toBe(REMOVIDO.toISOString());
  });
});

describe('Pedido.reidratar', () => {
  const base: PedidoProps = {
    id: ID,
    usuarioId: USUARIO,
    clienteId: OUTRO_ID,
    obraId: null,
    descricao: 'Escultura',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-11-01T12:00:00.000Z'),
    status: 'A_FAZER',
    fotoConclusaoPath: null,
    vendaDireta: false,
    quantidadeObra: 0,
    statusSync: 'PENDENTE',
    criadoEmLocal: CRIADO,
    deletedAt: null,
  };

  it.each([0, 1, 7])('devolve todos os campos com quantidadeObra %i', (quantidadeObra) => {
    const props = { ...base, quantidadeObra, obraId: quantidadeObra ? ID : null };
    const pedido = Pedido.reidratar(props);
    expect(getters(pedido, Object.keys(props))).toEqual(props);
  });

  it('aceita pedido FEITO com foto, venda direta e tombstone', () => {
    const pedido = Pedido.reidratar({
      ...base,
      status: 'FEITO',
      fotoConclusaoPath: 'fotos/x.jpg',
      vendaDireta: true,
      obraId: ID,
      quantidadeObra: 3,
      statusSync: 'SINCRONIZADO',
      deletedAt: REMOVIDO,
    });
    expect(pedido.status).toBe('FEITO');
    expect(pedido.fotoConclusaoPath).toBe('fotos/x.jpg');
    expect(pedido.vendaDireta).toBe(true);
    expect(pedido.deletedAt).toEqual(REMOVIDO);
  });

  it.each([
    ['id não UUID v4', { id: 'x' }],
    ['clienteId não UUID v4', { clienteId: 'x' }],
    ['obraId não UUID v4', { obraId: 'x' }],
    ['status fora do enum', { status: 'PRONTO' }],
    ['canalOrigem fora do enum', { canalOrigem: 'EMAIL' }],
    ['statusSync fora do enum', { statusSync: 'X' }],
    ['dataEntrega inválida', { dataEntrega: new Date('x') }],
    ['quantidadeObra não inteira', { quantidadeObra: 0.5 }],
    ['quantidadeObra negativa', { quantidadeObra: -1 }],
    ['vendaDireta não booleano', { vendaDireta: 1 }],
  ])('rejeita %s', (_, override) => {
    expect(() => Pedido.reidratar({ ...base, ...override } as PedidoProps)).toThrow(
      PedidoInvalidoError,
    );
  });

  it('não guarda referência às datas recebidas', () => {
    const entrega = new Date('2026-11-01T12:00:00.000Z');
    const criado = new Date(CRIADO.getTime());
    const pedido = Pedido.reidratar({ ...base, dataEntrega: entrega, criadoEmLocal: criado });
    entrega.setFullYear(2000);
    criado.setFullYear(2000);
    expect(pedido.dataEntrega.toISOString()).toBe('2026-11-01T12:00:00.000Z');
    expect(pedido.criadoEmLocal.toISOString()).toBe(CRIADO.toISOString());
  });
});

describe('Evento.reidratar', () => {
  const base: EventoProps = {
    id: ID,
    usuarioId: USUARIO,
    nome: 'Feira',
    data: new Date('2026-10-12T12:00:00.000Z'),
    endereco: 'Praça Central',
    localizacao: new Coordenada(-23.5505, -46.6333),
    observacoes: '',
    statusSync: 'SINCRONIZADO',
    criadoEmLocal: CRIADO,
    deletedAt: REMOVIDO,
  };

  it('devolve todos os campos', () => {
    const evento = Evento.reidratar(base);
    expect(getters(evento, Object.keys(base))).toEqual(base);
  });

  it.each([
    ['id não UUID v4', { id: 'x' }],
    ['statusSync fora do enum', { statusSync: 'X' }],
    ['data inválida', { data: new Date('x') }],
    ['localização ausente', { localizacao: { latitude: 0, longitude: 0 } }],
  ])('rejeita %s', (_, override) => {
    expect(() => Evento.reidratar({ ...base, ...override } as EventoProps)).toThrow(
      EventoInvalidoError,
    );
  });

  it('recria a Coordenada e rejeita coordenada fora do intervalo', () => {
    const fora = Object.create(Coordenada.prototype) as Coordenada;
    Object.assign(fora, { latitude: 91, longitude: 0 });
    expect(() => Evento.reidratar({ ...base, localizacao: fora })).toThrow(
      CoordenadaInvalidaError,
    );
    const evento = Evento.reidratar(base);
    expect(evento.localizacao).not.toBe(base.localizacao);
    expect(evento.localizacao).toBeInstanceOf(Coordenada);
  });

  it('não guarda referência às datas recebidas', () => {
    const criado = new Date(CRIADO.getTime());
    const evento = Evento.reidratar({ ...base, criadoEmLocal: criado });
    criado.setFullYear(2000);
    expect(evento.criadoEmLocal.toISOString()).toBe(CRIADO.toISOString());
  });
});
