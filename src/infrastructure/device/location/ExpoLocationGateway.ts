import * as Location from 'expo-location';

import { LocalizacaoIndisponivelError } from '../../../core/application/errors/LocalizacaoIndisponivelError';
import type { ILocationGateway } from '../../../core/application/gateways/ILocationGateway';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';

/** O expo-location não tem timeout próprio; sem limite, um GPS sem sinal prende a tela. */
export const TEMPO_LIMITE_GPS_MS = 10_000;

/**
 * ILocationGateway real: leitura pontual em primeiro plano, com a permissão pedida no
 * momento do uso (RNF12). Os estados do SDK viram LocalizacaoIndisponivelError.
 */
export class ExpoLocationGateway implements ILocationGateway {
  constructor(private readonly tempoLimiteMs = TEMPO_LIMITE_GPS_MS) {}

  async getCurrent(): Promise<Coordenada> {
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new LocalizacaoIndisponivelError('SERVICO_DESLIGADO');
    }

    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      throw new LocalizacaoIndisponivelError(permissao.canAskAgain ? 'NEGADA' : 'NEGADA_PERMANENTE');
    }

    const posicao = await this.lerPosicao();
    return new Coordenada(posicao.coords.latitude, posicao.coords.longitude);
  }

  private async lerPosicao(): Promise<Location.LocationObject> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new LocalizacaoIndisponivelError('TIMEOUT')),
        this.tempoLimiteMs,
      );
    });
    try {
      return await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        limite,
      ]);
    } catch (erro) {
      if (erro instanceof LocalizacaoIndisponivelError) throw erro;
      // O serviço pode ser desligado durante a leitura; o SDK não documenta códigos de erro.
      if (!(await Location.hasServicesEnabledAsync())) {
        throw new LocalizacaoIndisponivelError('SERVICO_DESLIGADO');
      }
      throw erro;
    } finally {
      clearTimeout(timer);
    }
  }
}
