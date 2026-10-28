import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { LocalizacaoIndisponivelError } from '../../../core/application/errors/LocalizacaoIndisponivelError';
import type { IGeocodingGateway } from '../../../core/application/gateways/IGeocodingGateway';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
import { TEMPO_LIMITE_GPS_MS } from './ExpoLocationGateway';
import { comLimiteDeTempo } from './limiteDeTempo';

/**
 * IGeocodingGateway com o geocoder nativo do aparelho (expo-location): grátis, sem chave,
 * precisa de internet. No Android o geocoder exige a permissão de localização.
 */
export class ExpoGeocodingGateway implements IGeocodingGateway {
  constructor(
    private readonly plataforma: string = Platform.OS,
    private readonly tempoLimiteMs = TEMPO_LIMITE_GPS_MS,
  ) {}

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
