import type { IMapaOffline } from '../gateways/IMapaOffline';
import { type EventoNoMapa, planejarAreasOffline } from '../mapa/planejarAreasOffline';

export interface ResultadoAreas {
  baixadas: number;
  apagadas: number;
  falhas: number;
}

/**
 * Mantém uma área de mapa offline para cada evento vivo (RF13 offline). Rode com internet: sem
 * rede, os downloads falham e ficam para a próxima vez, sem afetar o resto do app. Um gatilho
 * durante a execução é ignorado (a próxima chamada já vê o estado novo).
 */
export class SincronizarAreasOfflineUseCase {
  private emAndamento: Promise<ResultadoAreas> | null = null;

  constructor(private readonly mapa: IMapaOffline) {}

  execute(args: { eventos: readonly EventoNoMapa[] }): Promise<ResultadoAreas> {
    if (this.emAndamento) return this.emAndamento;
    this.emAndamento = this.reconciliar(args.eventos).finally(() => {
      this.emAndamento = null;
    });
    return this.emAndamento;
  }

  private async reconciliar(eventos: readonly EventoNoMapa[]): Promise<ResultadoAreas> {
    const resultado: ResultadoAreas = { baixadas: 0, apagadas: 0, falhas: 0 };
    let existentes;
    try {
      existentes = await this.mapa.areasBaixadas();
    } catch {
      return { ...resultado, falhas: 1 };
    }
    const plano = planejarAreasOffline(eventos, existentes);
    for (const eventoId of plano.apagar) {
      try {
        await this.mapa.apagarArea(eventoId);
        resultado.apagadas += 1;
      } catch {
        resultado.falhas += 1;
      }
    }
    for (const area of plano.baixar) {
      try {
        await this.mapa.baixarArea(area);
        resultado.baixadas += 1;
      } catch {
        resultado.falhas += 1;
      }
    }
    return resultado;
  }
}
