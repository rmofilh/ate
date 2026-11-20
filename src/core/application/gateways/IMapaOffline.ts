/** Área do mapa guardada no aparelho para abrir sem internet: uma por evento. */
export interface AreaOffline {
  eventoId: string;
  latitude: number;
  longitude: number;
}

/** Mapas offline (pacotes de imagens do mapa). Falhas de rede podem ser lançadas livremente. */
export interface IMapaOffline {
  areasBaixadas(): Promise<AreaOffline[]>;
  baixarArea(area: AreaOffline): Promise<void>;
  apagarArea(eventoId: string): Promise<void>;
}
