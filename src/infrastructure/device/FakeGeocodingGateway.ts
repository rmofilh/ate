import {
  LocalizacaoIndisponivelError,
  type MotivoLocalizacaoIndisponivel,
} from '../../core/application/errors/LocalizacaoIndisponivelError';
import type { IGeocodingGateway } from '../../core/application/gateways/IGeocodingGateway';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export class FakeGeocodingGateway implements IGeocodingGateway {
  readonly buscas: string[] = [];

  constructor(
    private readonly resultado: Coordenada | null = new Coordenada(-23.5614, -46.6558),
    private readonly falha: MotivoLocalizacaoIndisponivel | null = null,
  ) {}

  async buscar(endereco: string): Promise<Coordenada | null> {
    this.buscas.push(endereco);
    if (this.falha) throw new LocalizacaoIndisponivelError(this.falha);
    return this.resultado;
  }
}
