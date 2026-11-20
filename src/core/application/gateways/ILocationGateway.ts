import type { Coordenada } from '../../domain/value-objects/Coordenada';

export interface ILocationGateway {
  getCurrent(): Promise<Coordenada>;
  /**
   * Última posição que o aparelho já conhece, sem ligar o GPS e sem pedir permissão (RNF12):
   * serve para abrir o mapa rápido perto do usuário. null se não houver permissão ou posição.
   */
  ultimaConhecida(): Promise<Coordenada | null>;
}
