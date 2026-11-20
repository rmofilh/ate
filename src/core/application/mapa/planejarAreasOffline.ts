import type { AreaOffline } from '../gateways/IMapaOffline';

/** Evento do ponto de vista do mapa offline (estrutural: a entidade Evento já satisfaz). */
export interface EventoNoMapa {
  id: string;
  localizacao: { latitude: number; longitude: number };
}

export interface PlanoDeAreas {
  baixar: AreaOffline[];
  apagar: string[];
}

/** Menos que isto (~1 m) não conta como mudança de local. */
const TOLERANCIA_GRAUS = 1e-5;

function mesmoLugar(a: AreaOffline, b: AreaOffline): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < TOLERANCIA_GRAUS &&
    Math.abs(a.longitude - b.longitude) < TOLERANCIA_GRAUS
  );
}

/**
 * Compara os eventos vivos com as áreas já baixadas: baixa a área de evento novo ou que mudou de
 * lugar (a antiga é substituída) e apaga a de evento removido. Regra pura, sem SDK.
 */
export function planejarAreasOffline(
  eventos: readonly EventoNoMapa[],
  existentes: readonly AreaOffline[],
): PlanoDeAreas {
  const porEvento = new Map(existentes.map((area) => [area.eventoId, area]));
  const desejadas = eventos.map((evento) => ({
    eventoId: evento.id,
    latitude: evento.localizacao.latitude,
    longitude: evento.localizacao.longitude,
  }));
  const vivos = new Set(desejadas.map((area) => area.eventoId));

  const baixar = desejadas.filter((area) => {
    const atual = porEvento.get(area.eventoId);
    return !atual || !mesmoLugar(atual, area);
  });
  const apagar = [
    ...existentes.filter((area) => !vivos.has(area.eventoId)).map((area) => area.eventoId),
    ...baixar.filter((area) => porEvento.has(area.eventoId)).map((area) => area.eventoId),
  ];
  return { baixar, apagar };
}
