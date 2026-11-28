import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { LocalizacaoIndisponivelError } from '../../../core/application/errors/LocalizacaoIndisponivelError';
import type {
  IGeocodingGateway,
  SugestaoDeEndereco,
} from '../../../core/application/gateways/IGeocodingGateway';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
import { ExpoLocationGateway, TEMPO_LIMITE_GPS_MS } from './ExpoLocationGateway';
import { PhotonEnderecos } from './PhotonEnderecos';
import { comLimiteDeTempo } from '../../shared/limiteDeTempo';

/**
 * IGeocodingGateway: `buscar` usa o geocoder nativo do aparelho (expo-location; grátis, sem
 * chave, precisa de internet; no Android exige a permissão de localização). Sugestões ao digitar
 * e endereço a partir do pin vêm do Photon (OpenStreetMap), que não pede permissão.
 */
export class ExpoGeocodingGateway implements IGeocodingGateway {
  constructor(
    private readonly plataforma: string = Platform.OS,
    private readonly tempoLimiteMs = TEMPO_LIMITE_GPS_MS,
    private readonly enderecos: Pick<PhotonEnderecos, 'sugerir' | 'enderecoDe'> = new PhotonEnderecos(
      undefined,
      () => new ExpoLocationGateway().ultimaConhecida(),
    ),
  ) {}

  sugerir(texto: string): Promise<SugestaoDeEndereco[]> {
    return this.enderecos.sugerir(texto);
  }

  enderecoDe(coordenada: Coordenada): Promise<string | null> {
    return this.enderecos.enderecoDe(coordenada);
  }

  async buscar(endereco: string): Promise<Coordenada | null> {
    const texto = endereco.trim();
    if (!texto) return null;

    if (this.plataforma === 'android') {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted) {
        throw new LocalizacaoIndisponivelError(permissao.canAskAgain ? 'NEGADA' : 'NEGADA_PERMANENTE');
      }
    }

    let resultados: Location.LocationGeocodedLocation[];
    try {
      resultados = await comLimiteDeTempo(
        Location.geocodeAsync(texto),
        this.tempoLimiteMs,
        () => new LocalizacaoIndisponivelError('BUSCA_INDISPONIVEL'),
      );
    } catch (erro) {
      if (erro instanceof LocalizacaoIndisponivelError) throw erro;
      // O SDK não documenta códigos de erro; sem internet é a causa mais comum.
      throw new LocalizacaoIndisponivelError('BUSCA_INDISPONIVEL');
    }

    const primeiro = resultados[0];
    if (!primeiro || !Coordenada.validar(primeiro.latitude, primeiro.longitude)) return null;
    return new Coordenada(primeiro.latitude, primeiro.longitude);
  }
}
