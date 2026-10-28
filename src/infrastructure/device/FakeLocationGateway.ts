import {
  LocalizacaoIndisponivelError,
  type MotivoLocalizacaoIndisponivel,
} from '../../core/application/errors/LocalizacaoIndisponivelError';
import type { ILocationGateway } from '../../core/application/gateways/ILocationGateway';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export class FakeLocationGateway implements ILocationGateway {
  constructor(
    private readonly coord = new Coordenada(-23.5505, -46.6333),
    private readonly falha: MotivoLocalizacaoIndisponivel | null = null,
  ) {}

  async getCurrent(): Promise<Coordenada> {
    if (this.falha) throw new LocalizacaoIndisponivelError(this.falha);
    return this.coord;
  }
}
