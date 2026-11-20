/** Ponto em graus decimais (WGS84). */
export interface PontoNoMapa {
  latitude: number;
  longitude: number;
}

/** O MapLibre usa [longitude, latitude] (padrão GeoJSON): a ordem inversa da Coordenada. */
export type LngLat = [longitude: number, latitude: number];
/** [oeste, sul, leste, norte] */
export type Limites = [west: number, south: number, east: number, north: number];

export function paraLngLat(ponto: PontoNoMapa): LngLat {
  return [ponto.longitude, ponto.latitude];
}

export function deLngLat([longitude, latitude]: readonly [number, number]): PontoNoMapa {
  return { latitude, longitude };
}

const KM_POR_GRAU_DE_LATITUDE = 111.32;

/**
 * Caixa em volta de um ponto. 1° de latitude ≈ 111 km em qualquer lugar; 1° de longitude encolhe
 * com cos(latitude) (aula de fundamentos), por isso os dois deltas são diferentes.
 */
export function caixaEmVolta(centro: PontoNoMapa, raioKm: number): Limites {
  const dLat = raioKm / KM_POR_GRAU_DE_LATITUDE;
  const cosLat = Math.max(Math.cos((centro.latitude * Math.PI) / 180), 0.01);
  const dLng = raioKm / (KM_POR_GRAU_DE_LATITUDE * cosLat);
  return [centro.longitude - dLng, centro.latitude - dLat, centro.longitude + dLng, centro.latitude + dLat];
}

/** Caixa que contém todos os pontos (null se vazio ou se todos forem o mesmo ponto). */
export function caixaDosPontos(pontos: readonly PontoNoMapa[]): Limites | null {
  if (pontos.length < 2) return null;
  const lats = pontos.map((p) => p.latitude);
  const lngs = pontos.map((p) => p.longitude);
  const caixa: Limites = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  return caixa[0] === caixa[2] && caixa[1] === caixa[3] ? null : caixa;
}
