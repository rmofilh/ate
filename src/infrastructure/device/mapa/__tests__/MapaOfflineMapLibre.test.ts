import { mapLibreDeTeste } from '../../../../test-support/mocks/maplibre';
import { carregarMapLibre, ESTILO_DO_MAPA } from '../mapLibre';
import {
  LIMITE_DE_IMAGENS,
  MapaOfflineMapLibre,
  USER_AGENT,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
} from '../MapaOfflineMapLibre';

const AREA = { eventoId: 'e1', latitude: -19.92, longitude: -43.94 };

describe('MapaOfflineMapLibre', () => {
  beforeEach(() => mapLibreDeTeste.reiniciar());

  it('sem o módulo nativo (Expo Go) não existe', () => {
    expect(MapaOfflineMapLibre.criar(() => null)).toBeNull();
  });

  it('configura a trava de imagens, o cache e o User-Agent do OpenFreeMap', () => {
    MapaOfflineMapLibre.criar(carregarMapLibre);
    const { OfflineManager, TransformRequestManager } = carregarMapLibre()!;
    expect(OfflineManager.setTileCountLimit).toHaveBeenCalledWith(LIMITE_DE_IMAGENS);
    expect(OfflineManager.setMaximumAmbientCacheSize).toHaveBeenCalled();
    expect(TransformRequestManager.addHeader).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'User-Agent', value: USER_AGENT }),
    );
  });

  it('baixa a área em volta do evento com o estilo, os zooms e os metadados', async () => {
    const mapa = MapaOfflineMapLibre.criar(carregarMapLibre)!;

    await mapa.baixarArea(AREA);

    const [opcoes] = mapLibreDeTeste.opcoesCriadas as {
      mapStyle: string;
      minZoom: number;
      maxZoom: number;
      bounds: number[];
    }[];
    expect(opcoes).toMatchObject({ mapStyle: ESTILO_DO_MAPA, minZoom: ZOOM_MINIMO, maxZoom: ZOOM_MAXIMO });
    const [oeste, sul, leste, norte] = opcoes.bounds;
    expect(oeste).toBeLessThan(AREA.longitude);
    expect(leste).toBeGreaterThan(AREA.longitude);
    expect(sul).toBeLessThan(AREA.latitude);
    expect(norte).toBeGreaterThan(AREA.latitude);
    await expect(mapa.areasBaixadas()).resolves.toEqual([AREA]);
  });

  it('ignora pacotes que não são de evento e apaga só o do evento pedido', async () => {
    const mapa = MapaOfflineMapLibre.criar(carregarMapLibre)!;
    await mapa.baixarArea(AREA);
    await mapa.baixarArea({ ...AREA, eventoId: 'e2' });
    mapLibreDeTeste.pacotes.push({
      id: 'alheio',
      metadata: { nome: 'outro' },
      bounds: [0, 0, 1, 1],
      estado: 'complete',
      status: async () => ({ state: 'complete', percentage: 100 }),
      resume: jest.fn(),
    });

    await mapa.apagarArea('e1');

    expect((await mapa.areasBaixadas()).map((a) => a.eventoId)).toEqual(['e2']);
    expect(mapLibreDeTeste.pacotes.map((p) => p.id)).toContain('alheio');
  });

  it('retoma download interrompido ao listar as áreas', async () => {
    const mapa = MapaOfflineMapLibre.criar(carregarMapLibre)!;
    await mapa.baixarArea(AREA);
    const [pacote] = mapLibreDeTeste.pacotes;
    pacote.estado = 'inactive';

    await mapa.areasBaixadas();
    await new Promise((resolve) => setImmediate(resolve));

    expect(pacote.resume).toHaveBeenCalled();
  });
});
