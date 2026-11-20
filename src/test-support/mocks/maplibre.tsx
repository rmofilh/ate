/**
 * Dublê do @maplibre/maplibre-react-native (11.x) para os testes: os componentes viram Views que
 * repassam as props (os testes disparam onPress/onDragEnd com fireEvent) e o OfflineManager guarda
 * os pacotes em memória. `mapLibreDeTeste.disponivel = false` simula o Expo Go (sem módulo nativo).
 */
import React, { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

type LngLat = [number, number];

interface PacoteFalso {
  id: string;
  metadata: Record<string, unknown>;
  bounds: [number, number, number, number];
  estado: 'inactive' | 'active' | 'complete';
  status(): Promise<{ state: string; percentage: number }>;
  resume: jest.Mock;
}

export const mapLibreDeTeste = {
  disponivel: true,
  camera: { flyTo: jest.fn(), jumpTo: jest.fn(), easeTo: jest.fn(), fitBounds: jest.fn() },
  pacotes: [] as PacoteFalso[],
  opcoesCriadas: [] as Record<string, unknown>[],
  falharDownload: null as Error | null,
  reiniciar(): void {
    mapLibreDeTeste.disponivel = true;
    Object.values(mapLibreDeTeste.camera).forEach((fn) => fn.mockReset());
    mapLibreDeTeste.pacotes = [];
    mapLibreDeTeste.opcoesCriadas = [];
    mapLibreDeTeste.falharDownload = null;
    OfflineManager.setTileCountLimit.mockClear();
    OfflineManager.setMaximumAmbientCacheSize.mockClear();
    TransformRequestManager.addHeader.mockClear();
  },
};

/** Evento de toque no formato do MapLibre: { nativeEvent: { lngLat: [lng, lat], point } }. */
export function toqueNoMapa(latitude: number, longitude: number) {
  return { nativeEvent: { lngLat: [longitude, latitude] as LngLat, point: [0, 0] } };
}

export const Map = forwardRef<unknown, ViewProps & Record<string, unknown>>(function Map(props, _ref) {
  return <View {...props} />;
});

export const Camera = forwardRef<unknown, Record<string, unknown>>(function Camera(props, ref) {
  useImperativeHandle(ref, () => mapLibreDeTeste.camera);
  return <View testID="camera" {...props} />;
});

export function ViewAnnotation({
  id,
  children,
  ...props
}: { id?: string; children?: React.ReactNode } & Record<string, unknown>) {
  return (
    <View testID={`anotacao-${id ?? 'sem-id'}`} {...props}>
      {children}
    </View>
  );
}

let sequencia = 0;

export const OfflineManager = {
  setTileCountLimit: jest.fn(),
  setMaximumAmbientCacheSize: jest.fn(async () => {}),
  async createPack(opcoes: { metadata?: Record<string, unknown>; bounds: [number, number, number, number] }) {
    if (mapLibreDeTeste.falharDownload) throw mapLibreDeTeste.falharDownload;
    sequencia += 1;
    mapLibreDeTeste.opcoesCriadas.push(opcoes);
    const pacote: PacoteFalso = {
      id: `pacote-${sequencia}`,
      metadata: opcoes.metadata ?? {},
      bounds: opcoes.bounds,
      estado: 'complete',
      status: async () => ({ state: pacote.estado, percentage: pacote.estado === 'complete' ? 100 : 40 }),
      resume: jest.fn(async () => {}),
    };
    mapLibreDeTeste.pacotes.push(pacote);
    return pacote;
  },
  async getPacks() {
    return [...mapLibreDeTeste.pacotes];
  },
  async deletePack(id: string) {
    mapLibreDeTeste.pacotes = mapLibreDeTeste.pacotes.filter((p) => p.id !== id);
  },
};

export const TransformRequestManager = { addHeader: jest.fn(() => 'cabecalho') };
