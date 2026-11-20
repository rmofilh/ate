import type { AreaOffline, IMapaOffline } from '../../../core/application/gateways/IMapaOffline';
import { caixaEmVolta } from './geometria';
import { carregarMapLibre, ESTILO_DO_MAPA, type MapLibre } from './mapLibre';

/** Raio da área baixada em volta do evento: o entorno da feira, a pé. */
export const RAIO_DA_AREA_KM = 1.5;
/** Do bairro (10) até o nível da rua (16): dezenas de imagens por área. */
export const ZOOM_MINIMO = 10;
export const ZOOM_MAXIMO = 16;
/** Trava de segurança: o OpenFreeMap aceita até 3.000 imagens por área baixada. */
export const LIMITE_DE_IMAGENS = 3000;
/** Cache das áreas vistas com internet (além das baixadas). */
export const CACHE_AMBIENTE_BYTES = 50 * 1024 * 1024;
/** O OpenFreeMap pede um User-Agent que identifique o app nos downloads offline. */
export const USER_AGENT = 'ate-app/1.0 (gestao para artesaos)';

const MARCA = 'ate-evento';

interface MetadadosDaArea {
  marca?: unknown;
  eventoId?: unknown;
  latitude?: unknown;
  longitude?: unknown;
}

function lerArea(metadata: MetadadosDaArea): AreaOffline | null {
  if (
    metadata.marca !== MARCA ||
    typeof metadata.eventoId !== 'string' ||
    typeof metadata.latitude !== 'number' ||
    typeof metadata.longitude !== 'number'
  ) {
    return null;
  }
  return { eventoId: metadata.eventoId, latitude: metadata.latitude, longitude: metadata.longitude };
}

/**
 * Áreas de mapa offline com o OfflineManager do MapLibre: um pacote por evento, identificado pelos
 * metadados. Downloads interrompidos (sem rede) são retomados na próxima reconciliação.
 */
export class MapaOfflineMapLibre implements IMapaOffline {
  private constructor(private readonly mapLibre: MapLibre) {
    mapLibre.OfflineManager.setTileCountLimit(LIMITE_DE_IMAGENS);
    void mapLibre.OfflineManager.setMaximumAmbientCacheSize(CACHE_AMBIENTE_BYTES).catch(() => {});
    mapLibre.TransformRequestManager.addHeader({
      name: 'User-Agent',
      value: USER_AGENT,
      match: 'openfreemap\\.org',
    });
  }

  /** null no Expo Go (sem o módulo nativo): o app segue sem mapas offline. */
  static criar(carregar: () => MapLibre | null = carregarMapLibre): MapaOfflineMapLibre | null {
    const mapLibre = carregar();
    return mapLibre ? new MapaOfflineMapLibre(mapLibre) : null;
  }

  async areasBaixadas(): Promise<AreaOffline[]> {
    const areas: AreaOffline[] = [];
    for (const pacote of await this.mapLibre.OfflineManager.getPacks()) {
      const area = lerArea(pacote.metadata as MetadadosDaArea);
      if (!area) continue;
      areas.push(area);
      // Download interrompido (ex.: a rede caiu): retoma em segundo plano.
      void pacote
        .status()
        .then((status) => (status.state === 'inactive' && status.percentage < 100 ? pacote.resume() : undefined))
        .catch(() => undefined);
    }
    return areas;
  }

  async baixarArea(area: AreaOffline): Promise<void> {
    await this.mapLibre.OfflineManager.createPack(
      {
        mapStyle: ESTILO_DO_MAPA,
        bounds: caixaEmVolta(area, RAIO_DA_AREA_KM),
        minZoom: ZOOM_MINIMO,
        maxZoom: ZOOM_MAXIMO,
        metadata: { marca: MARCA, ...area },
      },
      () => {},
      () => {},
    );
  }

  async apagarArea(eventoId: string): Promise<void> {
    for (const pacote of await this.mapLibre.OfflineManager.getPacks()) {
      if (lerArea(pacote.metadata as MetadadosDaArea)?.eventoId === eventoId) {
        await this.mapLibre.OfflineManager.deletePack(pacote.id);
      }
    }
  }
}
