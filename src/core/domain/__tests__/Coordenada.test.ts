import { Coordenada } from '../value-objects/Coordenada';

describe('Coordenada', () => {
  it('aceita ponto válido de feira', () => {
    const c = new Coordenada(-23.5505, -46.6333);
    expect(c.latitude).toBe(-23.5505);
    expect(c.longitude).toBe(-46.6333);
  });

  it('validar() rejeita latitude fora de [-90,90]', () => {
    expect(Coordenada.validar(-91, 0)).toBe(false);
    expect(Coordenada.validar(90.0001, 0)).toBe(false);
    expect(Coordenada.validar(90, 180)).toBe(true);
  });

  it('construtor lança em longitude fora de [-180,180]', () => {
    expect(() => new Coordenada(0, 181)).toThrow(/longitude/i);
  });

  it('Review Focus: rejeita NaN e Infinity', () => {
    expect(Coordenada.validar(NaN, 0)).toBe(false);
    expect(Coordenada.validar(0, Infinity)).toBe(false);
    expect(() => new Coordenada(NaN, 0)).toThrow();
    expect(() => new Coordenada(0, Infinity)).toThrow();
  });
});
