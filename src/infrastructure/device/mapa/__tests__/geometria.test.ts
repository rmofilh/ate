import { caixaDosPontos, caixaEmVolta, deLngLat, paraLngLat } from '../geometria';

describe('geometria do mapa', () => {
  it('converte para [lng, lat] e volta (a ordem que o material alerta)', () => {
    const ponto = { latitude: -21.5561, longitude: -45.4345 };
    expect(paraLngLat(ponto)).toEqual([-45.4345, -21.5561]);
    expect(deLngLat(paraLngLat(ponto))).toEqual(ponto);
  });

  it('caixa em volta: delta de longitude maior que o de latitude fora do Equador', () => {
    const [oeste, sul, leste, norte] = caixaEmVolta({ latitude: -60, longitude: 0 }, 1.5);
    const dLat = (norte - sul) / 2;
    const dLng = (leste - oeste) / 2;
    expect(dLat).toBeCloseTo(1.5 / 111.32, 6);
    expect(dLng).toBeCloseTo(dLat * 2, 4); // cos(60°) = 0,5
  });

  it('caixa dos pontos: null para menos de 2 pontos ou pontos iguais', () => {
    expect(caixaDosPontos([])).toBeNull();
    expect(caixaDosPontos([{ latitude: 1, longitude: 2 }])).toBeNull();
    expect(caixaDosPontos([{ latitude: 1, longitude: 2 }, { latitude: 1, longitude: 2 }])).toBeNull();
    expect(
      caixaDosPontos([
        { latitude: -20, longitude: -44 },
        { latitude: -19, longitude: -43 },
      ]),
    ).toEqual([-44, -20, -43, -19]);
  });
});
