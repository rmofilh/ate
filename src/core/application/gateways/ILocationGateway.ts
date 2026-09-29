import type { Coordenada } from '../../domain/value-objects/Coordenada';

export interface ILocationGateway {
  getCurrent(): Promise<Coordenada>;
}
