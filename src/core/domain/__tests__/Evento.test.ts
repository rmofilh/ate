import { Evento } from '../entities/Evento';
import { Coordenada } from '../value-objects/Coordenada';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const ponto = () => new Coordenada(-23.5505, -46.6333);

describe('Evento', () => {
  it('cria com coordenadas e PENDENTE', () => {
    const e = Evento.criar({
      usuarioId,
      nome: 'Feira da Praça',
      data: new Date('2026-10-12'),
      endereco: 'Praça Central, banca 5',
      localizacao: ponto(),
      observacoes: 'Levar corujas',
    });
    expect(e.nome).toBe('Feira da Praça');
    expect(e.localizacao.latitude).toBe(-23.5505);
    expect(e.statusSync).toBe('PENDENTE');
    expect(e.deletedAt).toBeNull();
  });

  it('rejeita nome só-espaços e data inválida', () => {
    expect(() =>
      Evento.criar({
        usuarioId,
        nome: '   ',
        data: new Date('2026-10-12'),
        endereco: 'x',
        localizacao: ponto(),
      }),
    ).toThrow(/nome/i);
    expect(() =>
      Evento.criar({
        usuarioId,
        nome: 'F',
        data: new Date('invalida'),
        endereco: 'x',
        localizacao: ponto(),
      }),
    ).toThrow(/data/i);
  });

  it('rejeita endereço vazio ou só-espaços na criação e edição', () => {
    expect(() =>
      Evento.criar({
        usuarioId,
        nome: 'F',
        data: new Date('2026-10-12'),
        endereco: '   ',
        localizacao: ponto(),
      }),
    ).toThrow(/endere/i);

    const e = Evento.criar({
      usuarioId,
      nome: 'F',
      data: new Date('2026-10-12'),
      endereco: 'x',
      localizacao: ponto(),
    });
    expect(() => e.editar('F', new Date('2026-11-01'), '   ', ponto(), '')).toThrow(/endere/i);
  });

  it('protege a data contra mutações externas', () => {
    const data = new Date('2026-10-12');
    const e = Evento.criar({
      usuarioId,
      nome: 'F',
      data,
      endereco: 'x',
      localizacao: ponto(),
    });

    data.setTime(NaN);
    expect(e.data.toISOString()).toBe('2026-10-12T00:00:00.000Z');

    const dataExposta = e.data;
    dataExposta.setTime(NaN);
    expect(e.data.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });

  it('editar() troca todos os campos e cancelar() soft-deleta', () => {
    const e = Evento.criar({
      usuarioId,
      nome: 'F',
      data: new Date('2026-10-12'),
      endereco: 'x',
      localizacao: ponto(),
    });
    e.editar('Feira Nova', new Date('2026-11-01'), 'Rua B, 10', new Coordenada(0, 0), 'obs');
    expect(e.nome).toBe('Feira Nova');
    e.cancelar();
    expect(e.deletedAt).toBeInstanceOf(Date);
    expect(() => e.editar('y', new Date(), 'z', ponto(), '')).toThrow(/removido/i);
  });
});
