import type { ILocationGateway } from '../../core/application/gateways/ILocationGateway';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export class FakeLocationGateway implements ILocationGateway {
  constructor(
    private readonly coord = new Coordenada(-23.5505, -46.6333),
    private readonly denied = false,
  ) {}

  async getCurrent(): Promise<Coordenada> {
    if (this.denied) {
      throw new Error('Localizacao negada - posicione o pin manualmente no mapa');
    }
    return this.coord;
  }
}
