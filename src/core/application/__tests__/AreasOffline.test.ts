import type { AreaOffline, IMapaOffline } from '../gateways/IMapaOffline';
import { planejarAreasOffline } from '../mapa/planejarAreasOffline';
import { SincronizarAreasOfflineUseCase } from '../usecases/SincronizarAreasOfflineUseCase';

const evento = (id: string, latitude: number, longitude: number) => ({
  id,
  localizacao: { latitude, longitude },
});
const area = (eventoId: string, latitude: number, longitude: number): AreaOffline => ({
  eventoId,
  latitude,
  longitude,
});

describe('planejarAreasOffline', () => {
  it('baixa a área de evento novo', () => {
    expect(planejarAreasOffline([evento('e1', -19.9, -43.9)], [])).toEqual({
      baixar: [area('e1', -19.9, -43.9)],
      apagar: [],
    });
  });

  it('nada a fazer quando a área já existe no mesmo lugar', () => {
    expect(
      planejarAreasOffline([evento('e1', -19.9, -43.9)], [area('e1', -19.900001, -43.900001)]),
    ).toEqual({ baixar: [], apagar: [] });
  });

  it('evento que mudou de lugar: apaga a área antiga e baixa a nova', () => {
    expect(planejarAreasOffline([evento('e1', -20, -44)], [area('e1', -19.9, -43.9)])).toEqual({
      baixar: [area('e1', -20, -44)],
      apagar: ['e1'],
    });
  });

  it('evento removido: apaga a área', () => {
    expect(planejarAreasOffline([], [area('e1', -19.9, -43.9)])).toEqual({
      baixar: [],
      apagar: ['e1'],
    });
  });
});

class MapaFake implements IMapaOffline {
  areas: AreaOffline[] = [];
  falharDownload = false;
  chamadas = 0;
  async areasBaixadas() {
    return [...this.areas];
  }
  async baixarArea(nova: AreaOffline) {
    this.chamadas += 1;
    if (this.falharDownload) throw new Error('sem rede');
    this.areas.push(nova);
  }
  async apagarArea(eventoId: string) {
    this.areas = this.areas.filter((a) => a.eventoId !== eventoId);
  }
}

describe('SincronizarAreasOfflineUseCase', () => {
  it('reconcilia: baixa as novas, troca as que mudaram e apaga as de eventos removidos', async () => {
    const mapa = new MapaFake();
    mapa.areas = [area('e1', -19.9, -43.9), area('removido', 0, 0)];
    const caso = new SincronizarAreasOfflineUseCase(mapa);

    const resultado = await caso.execute({
      eventos: [evento('e1', -20, -44), evento('e2', -21, -45)],
    });

    expect(resultado).toEqual({ baixadas: 2, apagadas: 2, falhas: 0 });
    expect(mapa.areas.map((a) => a.eventoId).sort()).toEqual(['e1', 'e2']);
    expect(mapa.areas.find((a) => a.eventoId === 'e1')).toEqual(area('e1', -20, -44));
  });

  it('download sem rede conta falha e não lança; a próxima execução tenta de novo', async () => {
    const mapa = new MapaFake();
    mapa.falharDownload = true;
    const caso = new SincronizarAreasOfflineUseCase(mapa);

    await expect(caso.execute({ eventos: [evento('e1', 1, 1)] })).resolves.toMatchObject({
      falhas: 1,
    });

    mapa.falharDownload = false;
    await expect(caso.execute({ eventos: [evento('e1', 1, 1)] })).resolves.toMatchObject({
      baixadas: 1,
    });
  });

  it('chamada durante a execução reaproveita a mesma (sem downloads duplicados)', async () => {
    const mapa = new MapaFake();
    const caso = new SincronizarAreasOfflineUseCase(mapa);
    const eventos = [evento('e1', 1, 1)];

    const [a, b] = await Promise.all([caso.execute({ eventos }), caso.execute({ eventos })]);

    expect(a).toBe(b);
    expect(mapa.chamadas).toBe(1);
  });
});
