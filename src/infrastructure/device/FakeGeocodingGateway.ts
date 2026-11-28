import {
  LocalizacaoIndisponivelError,
  type MotivoLocalizacaoIndisponivel,
} from '../../core/application/errors/LocalizacaoIndisponivelError';
import type {
  IGeocodingGateway,
  SugestaoDeEndereco,
} from '../../core/application/gateways/IGeocodingGateway';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export class FakeGeocodingGateway implements IGeocodingGateway {
  readonly buscas: string[] = [];
  readonly pedidosDeSugestao: string[] = [];
  sugestoes: SugestaoDeEndereco[] = [];
  enderecoDoPonto: string | null = null;

  constructor(
    private readonly resultado: Coordenada | null = new Coordenada(-23.5614, -46.6558),
    private readonly falha: MotivoLocalizacaoIndisponivel | null = null,
  ) {}

  async buscar(endereco: string): Promise<Coordenada | null> {
    this.buscas.push(endereco);
    if (this.falha) throw new LocalizacaoIndisponivelError(this.falha);
    return this.resultado;
  }

  async sugerir(texto: string): Promise<SugestaoDeEndereco[]> {
    this.pedidosDeSugestao.push(texto);
    return this.sugestoes;
  }

  async enderecoDe(_coordenada: Coordenada): Promise<string | null> {
    return this.enderecoDoPonto;
  }
}
