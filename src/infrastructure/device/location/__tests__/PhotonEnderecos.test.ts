import { Coordenada } from '../../../../core/domain/value-objects/Coordenada';
import { PhotonEnderecos, rotuloDe } from '../PhotonEnderecos';

const resposta = (features: unknown[], ok = true) => async () => ({ ok, json: async () => ({ features }) });

const avenida = {
  properties: {
    name: 'Avenida Afonso Pena',
    district: 'Serra',
    city: 'Belo Horizonte',
    state: 'Minas Gerais',
    countrycode: 'BR',
  },
  geometry: { coordinates: [-43.9232, -19.9437] },
};
const hotel = {
  properties: {
    name: 'Quality Hotel Afonso Pena',
    street: 'Avenida Afonso Pena',
    housenumber: '3761',
    district: 'Serra',
    city: 'Belo Horizonte',
    state: 'Minas Gerais',
    countrycode: 'BR',
  },
  geometry: { coordinates: [-43.9231, -19.943] },
};

describe('PhotonEnderecos', () => {
  it('rótulo legível com rua, número, bairro, cidade e UF', () => {
    expect(rotuloDe(hotel.properties)).toBe(
      'Quality Hotel Afonso Pena – Avenida Afonso Pena, 3761 – Serra, Belo Horizonte - MG',
    );
    expect(rotuloDe(avenida.properties)).toBe('Avenida Afonso Pena – Serra, Belo Horizonte - MG');
    expect(rotuloDe({})).toBeNull();
  });

  it('sugere endereços do Brasil com a coordenada, sem repetir', async () => {
    const requisitar = jest.fn(
      resposta([
        avenida,
        avenida,
        hotel,
        { properties: { name: 'Afonso Pena', countrycode: 'PT' }, geometry: { coordinates: [-8, 41] } },
      ]),
    );
    const photon = new PhotonEnderecos(requisitar);

    const sugestoes = await photon.sugerir('av afonso pena');

    expect(sugestoes.map((s) => s.rotulo)).toEqual([
      'Avenida Afonso Pena – Serra, Belo Horizonte - MG',
      'Quality Hotel Afonso Pena – Avenida Afonso Pena, 3761 – Serra, Belo Horizonte - MG',
    ]);
    expect(sugestoes[0].coordenada).toEqual(new Coordenada(-19.9437, -43.9232));
    const [url, init] = requisitar.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toContain('https://photon.komoot.io/api/?q=av+afonso+pena');
    expect(init.headers['User-Agent']).toMatch(/^ate-app/);
  });

  it('puxa as sugestões para perto da última posição conhecida', async () => {
    const requisitar = jest.fn(resposta([]));
    await new PhotonEnderecos(requisitar, async () => new Coordenada(-22.23, -45.93)).sugerir('rua x');
    expect((requisitar.mock.calls[0] as unknown as [string])[0]).toContain('lat=-22.23&lon=-45.93');
  });

  it('menos de 3 letras não consulta', async () => {
    const requisitar = jest.fn(resposta([avenida]));
    await expect(new PhotonEnderecos(requisitar).sugerir('av')).resolves.toEqual([]);
    expect(requisitar).not.toHaveBeenCalled();
  });

  it('sem rede, erro HTTP ou demora: lista vazia e null, nunca lança', async () => {
    const semRede = new PhotonEnderecos(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(semRede.sugerir('av afonso pena')).resolves.toEqual([]);
    await expect(semRede.enderecoDe(new Coordenada(1, 1))).resolves.toBeNull();

    await expect(new PhotonEnderecos(resposta([avenida], false)).sugerir('av afonso')).resolves.toEqual([]);

    const lento = new PhotonEnderecos(() => new Promise(() => {}), undefined, 20);
    await expect(lento.sugerir('av afonso')).resolves.toEqual([]);
  });

  it('endereço a partir do ponto (reverso)', async () => {
    const requisitar = jest.fn(
      resposta([
        {
          properties: { name: 'Rua Juruá', district: 'Centro', city: 'Pouso Alegre', state: 'Minas Gerais' },
          geometry: { coordinates: [-45.93, -22.23] },
        },
      ]),
    );
    await expect(new PhotonEnderecos(requisitar).enderecoDe(new Coordenada(-22.23, -45.93))).resolves.toBe(
      'Rua Juruá – Centro, Pouso Alegre - MG',
    );
    expect((requisitar.mock.calls[0] as unknown as [string])[0]).toContain('/reverse?lat=-22.23&lon=-45.93');
  });
});
