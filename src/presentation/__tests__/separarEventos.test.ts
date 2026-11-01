import { Evento } from '../../core/domain/entities/Evento';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { gerarIdTeste } from '../../test-support/ids';
import { parseCalendarDate } from '../utils/date';
import { separarEventos } from '../utils/eventos';

const evento = (nome: string, dia: string) => Evento.criar({
  id: gerarIdTeste(),
  usuarioId: 'a1111111-1111-4111-8111-111111111111',
  nome,
  data: parseCalendarDate(dia)!,
  endereco: 'Rua A',
  localizacao: new Coordenada(0, 0),
});
const nomes = (lista: Evento[]) => lista.map((item) => item.nome);
const HOJE = new Date(2026, 10, 15, 10);

describe('separarEventos', () => {
  it('ordena próximos do mais perto ao mais distante e realizados do mais recente ao mais antigo', () => {
    const { proximos, realizados } = separarEventos([
      evento('dez', '2026-12-01'),
      evento('out', '2026-10-01'),
      evento('nov', '2026-11-20'),
      evento('set', '2026-09-01'),
    ], HOJE);

    expect(nomes(proximos)).toEqual(['nov', 'dez']);
    expect(nomes(realizados)).toEqual(['out', 'set']);
  });

  it('o evento de hoje ainda é próximo e o de ontem já é realizado', () => {
    const { proximos, realizados } = separarEventos(
      [evento('hoje', '2026-11-15'), evento('ontem', '2026-11-14')],
      HOJE,
    );

    expect(nomes(proximos)).toEqual(['hoje']);
    expect(nomes(realizados)).toEqual(['ontem']);
  });

  it('usa o dia local de hoje: 23h e 0h não mudam o dia do evento', () => {
    const lista = [evento('hoje', '2026-11-15')];

    expect(nomes(separarEventos(lista, new Date(2026, 10, 15, 23, 59)).proximos)).toEqual(['hoje']);
    expect(nomes(separarEventos(lista, new Date(2026, 10, 15, 0, 1)).proximos)).toEqual(['hoje']);
    expect(nomes(separarEventos(lista, new Date(2026, 10, 16, 0, 1)).realizados)).toEqual(['hoje']);
  });

  it('não altera a lista recebida', () => {
    const lista = [evento('b', '2026-12-02'), evento('a', '2026-12-01')];

    separarEventos(lista, HOJE);

    expect(nomes(lista)).toEqual(['b', 'a']);
  });
});
