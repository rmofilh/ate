import { TurboModuleRegistry } from 'react-native';

export type MapLibre = typeof import('@maplibre/maplibre-react-native');

/** Estilo vetorial do OpenFreeMap: sem chave, sem cadastro, uso comercial permitido. */
export const ESTILO_DO_MAPA = 'https://tiles.openfreemap.org/styles/liberty';

let carregado: MapLibre | null | undefined;

/**
 * O MapLibre só existe no app instalado (development build/APK), não no Expo Go. O pacote usa
 * `TurboModuleRegistry.getEnforcing`, que lança já na importação sem o módulo nativo; por isso
 * ele é carregado sob demanda, depois de conferir que o módulo existe. null = sem mapa nativo.
 */
export function carregarMapLibre(): MapLibre | null {
  if (carregado !== undefined) return carregado;
  carregado = TurboModuleRegistry.get('MLRNMapViewModule')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@maplibre/maplibre-react-native') as MapLibre)
    : null;
  return carregado;
}
