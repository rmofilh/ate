import { ErroDeSincronizacao, tipoDoErro } from '../errors/ErroDeSincronizacao';
import { organizarFila } from '../sync/organizarFila';
import { ESPERA_MAXIMA_MS, proximaTentativa } from '../sync/politicaDeRetentativa';
import { tabelaDaEntidade } from '../sync/tipos';

const AGORA = new Date('2026-11-10T12:00:00.000Z');

describe('proximaTentativa (backoff exponencial com jitter)', () => {
  const espera = (tentativas: number, aleatorio: number) =>
    proximaTentativa(tentativas, AGORA, () => aleatorio).getTime() - AGORA.getTime();

  it('dobra a cada tentativa a partir de 2 s', () => {
    expect(espera(0, 0.5)).toBe(2_000);
    expect(espera(1, 0.5)).toBe(4_000);
    expect(espera(3, 0.5)).toBe(16_000);
  });

  it('para em 15 min', () => {
    expect(espera(30, 0.5)).toBe(ESPERA_MAXIMA_MS);
  });

  it('jitter entre 0,5× e 1,5×', () => {
    expect(espera(2, 0)).toBe(4_000);
    expect(espera(2, 0.999)).toBeLessThan(12_000);
    expect(espera(2, 0.999)).toBeGreaterThan(11_900);
  });
});

describe('organizarFila', () => {
  const entrada = (id: string, entidade: string, entidadeId: string, minuto: number) => ({
    id,
    entidade,
    entidadeId,
    tentativas: 0,
    criadoEmLocal: `2026-11-10T12:${String(minuto).padStart(2, '0')}:00.000Z`,
  });

  it('coalesce várias operações da mesma linha num grupo só', () => {
    const grupos = organizarFila([
      entrada('f1', 'Pedido', 'p1', 1),
      entrada('f2', 'Pedido', 'p1', 2),
      entrada('f3', 'Pedido', 'p1', 3),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].entradas.map((e) => e.id)).toEqual(['f1', 'f2', 'f3']);
  });

  it('pai antes de filho, mesmo que o filho tenha entrado antes na fila', () => {
    const grupos = organizarFila([
      entrada('f1', 'Pedido', 'p1', 1),
      entrada('f2', 'Evento', 'e1', 2),
      entrada('f3', 'Obra', 'o1', 3),
      entrada('f4', 'Cliente', 'c1', 4),
    ]);
    expect(grupos.map((g) => g.tabela)).toEqual(['clientes', 'obras', 'pedidos', 'eventos']);
  });

  it('na mesma tabela, pela ordem da primeira operação', () => {
    const grupos = organizarFila([
      entrada('f2', 'Cliente', 'c2', 5),
      entrada('f1', 'Cliente', 'c1', 1),
    ]);
    expect(grupos.map((g) => g.entidadeId)).toEqual(['c1', 'c2']);
  });

  it('ignora entidade desconhecida', () => {
    expect(organizarFila([entrada('f1', 'Outra', 'x', 1)])).toEqual([]);
    expect(tabelaDaEntidade('Outra')).toBeNull();
  });
});

describe('ErroDeSincronizacao', () => {
  it('erro desconhecido conta como transitório (nunca descarta dado)', () => {
    expect(tipoDoErro(new Error('qualquer'))).toBe('TRANSITORIO');
    expect(tipoDoErro(new ErroDeSincronizacao('PERMANENTE', 'x'))).toBe('PERMANENTE');
  });
});
