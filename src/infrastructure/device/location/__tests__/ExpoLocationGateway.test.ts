import { LocalizacaoIndisponivelError } from '../../../../core/application/errors/LocalizacaoIndisponivelError';
import { CoordenadaInvalidaError } from '../../../../core/domain/errors/DomainErrors';
import { Coordenada } from '../../../../core/domain/value-objects/Coordenada';
import {
  Accuracy,
  localizacaoDeTeste,
  permissoesDeLocalizacao,
} from '../../../../test-support/mocks/expoLocation';
import { ExpoLocationGateway, TEMPO_LIMITE_GPS_MS } from '../ExpoLocationGateway';

beforeEach(() => localizacaoDeTeste.reiniciar());
afterEach(() => jest.useRealTimers());

async function motivoDaFalha(gateway: ExpoLocationGateway) {
  const erro = await gateway.getCurrent().then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(LocalizacaoIndisponivelError);
  return (erro as LocalizacaoIndisponivelError).motivo;
}

describe('ExpoLocationGateway', () => {
  it('com permissão concedida devolve a Coordenada lida do GPS', async () => {
    const coordenada = await new ExpoLocationGateway().getCurrent();

    expect(coordenada).toBeInstanceOf(Coordenada);
    expect(coordenada).toEqual(expect.objectContaining({ latitude: -23.5617, longitude: -46.6559 }));
  });

  it('pede a permissão de primeiro plano e lê a posição com precisão Balanced', async () => {
    await new ExpoLocationGateway().getCurrent();

    expect(localizacaoDeTeste.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(localizacaoDeTeste.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Accuracy.Balanced,
    });
  });

  it('serviço de localização desligado → SERVICO_DESLIGADO, sem pedir permissão', async () => {
    localizacaoDeTeste.servicosLigados = false;

    expect(await motivoDaFalha(new ExpoLocationGateway())).toBe('SERVICO_DESLIGADO');
    expect(localizacaoDeTeste.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(localizacaoDeTeste.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('permissão negada → NEGADA, sem ler a posição', async () => {
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.negada;

    expect(await motivoDaFalha(new ExpoLocationGateway())).toBe('NEGADA');
    expect(localizacaoDeTeste.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('permissão negada sem poder pedir de novo → NEGADA_PERMANENTE', async () => {
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.negadaParaSempre;

    expect(await motivoDaFalha(new ExpoLocationGateway())).toBe('NEGADA_PERMANENTE');
    expect(localizacaoDeTeste.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('GPS que não responde dentro do limite → TIMEOUT', async () => {
    jest.useFakeTimers();
    localizacaoDeTeste.getCurrentPositionAsync.mockImplementation(() => new Promise(() => {}));

    const resultado = new ExpoLocationGateway().getCurrent().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_GPS_MS);

    const erro = await resultado;
    expect(erro).toBeInstanceOf(LocalizacaoIndisponivelError);
    expect((erro as LocalizacaoIndisponivelError).motivo).toBe('TIMEOUT');
  });

  it('resposta antes do limite não dispara o TIMEOUT depois', async () => {
    jest.useFakeTimers();

    const coordenada = await new ExpoLocationGateway().getCurrent();
    expect(jest.getTimerCount()).toBe(0);
    expect(coordenada.latitude).toBe(-23.5617);
  });

  it('aceita um limite de tempo próprio', async () => {
    jest.useFakeTimers();
    localizacaoDeTeste.getCurrentPositionAsync.mockImplementation(() => new Promise(() => {}));

    const resultado = new ExpoLocationGateway(500).getCurrent().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(500);

    expect(await resultado).toMatchObject({ motivo: 'TIMEOUT' });
  });

  it('coordenada fora da faixa vinda do SDK vira erro de domínio', async () => {
    localizacaoDeTeste.proximaPosicao = {
      coords: { latitude: 120, longitude: 0, accuracy: null },
      timestamp: 0,
    };

    await expect(new ExpoLocationGateway().getCurrent()).rejects.toBeInstanceOf(
      CoordenadaInvalidaError,
    );
  });

  it('falha do SDK depois que o serviço foi desligado no meio → SERVICO_DESLIGADO', async () => {
    localizacaoDeTeste.getCurrentPositionAsync.mockImplementation(async () => {
      localizacaoDeTeste.servicosLigados = false;
      throw new Error('Location services are disabled');
    });

    expect(await motivoDaFalha(new ExpoLocationGateway())).toBe('SERVICO_DESLIGADO');
  });

  it('outra falha do SDK é propagada sem mascarar', async () => {
    localizacaoDeTeste.getCurrentPositionAsync.mockRejectedValue(new Error('falha nativa'));

    await expect(new ExpoLocationGateway().getCurrent()).rejects.toThrow('falha nativa');
  });
});
