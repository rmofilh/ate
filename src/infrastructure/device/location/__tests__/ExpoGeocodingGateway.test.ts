import { LocalizacaoIndisponivelError } from '../../../../core/application/errors/LocalizacaoIndisponivelError';
import { Coordenada } from '../../../../core/domain/value-objects/Coordenada';
import {
  localizacaoDeTeste,
  permissoesDeLocalizacao,
} from '../../../../test-support/mocks/expoLocation';
import { ExpoGeocodingGateway } from '../ExpoGeocodingGateway';
import { TEMPO_LIMITE_GPS_MS } from '../ExpoLocationGateway';

beforeEach(() => localizacaoDeTeste.reiniciar());
afterEach(() => jest.useRealTimers());

const android = () => new ExpoGeocodingGateway('android');
const ios = () => new ExpoGeocodingGateway('ios');

async function motivoDaFalha(gateway: ExpoGeocodingGateway, endereco = 'Praça da Sé, São Paulo') {
  const erro = await gateway.buscar(endereco).then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(LocalizacaoIndisponivelError);
  return (erro as LocalizacaoIndisponivelError).motivo;
}

describe('ExpoGeocodingGateway', () => {
  it('devolve a Coordenada do primeiro resultado do geocoder nativo', async () => {
    localizacaoDeTeste.resultadosDaBusca = [
      { latitude: -22.9068, longitude: -43.1729 },
      { latitude: 0, longitude: 0 },
    ];

    const coordenada = await ios().buscar('Praça XV, Rio de Janeiro');

    expect(coordenada).toBeInstanceOf(Coordenada);
    expect(coordenada).toEqual(expect.objectContaining({ latitude: -22.9068, longitude: -43.1729 }));
    expect(localizacaoDeTeste.geocodeAsync).toHaveBeenCalledWith('Praça XV, Rio de Janeiro');
  });

  it('endereço não encontrado → null', async () => {
    localizacaoDeTeste.resultadosDaBusca = [];

    expect(await ios().buscar('lugar que não existe')).toBeNull();
  });

  it('endereço vazio → null sem chamar o SDK nem pedir permissão', async () => {
    expect(await android().buscar('   ')).toBeNull();
    expect(localizacaoDeTeste.geocodeAsync).not.toHaveBeenCalled();
    expect(localizacaoDeTeste.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('envia o endereço sem espaços nas pontas', async () => {
    await ios().buscar('  Rua Augusta, 100  ');
    expect(localizacaoDeTeste.geocodeAsync).toHaveBeenCalledWith('Rua Augusta, 100');
  });

  it('no Android pede a permissão de localização antes de buscar', async () => {
    await android().buscar('Rua Augusta, 100');
    expect(localizacaoDeTeste.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('no iOS busca sem pedir permissão', async () => {
    await ios().buscar('Rua Augusta, 100');
    expect(localizacaoDeTeste.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('Android com permissão negada → NEGADA, sem buscar', async () => {
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.negada;

    expect(await motivoDaFalha(android())).toBe('NEGADA');
    expect(localizacaoDeTeste.geocodeAsync).not.toHaveBeenCalled();
  });

  it('Android com permissão negada para sempre → NEGADA_PERMANENTE', async () => {
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.negadaParaSempre;

    expect(await motivoDaFalha(android())).toBe('NEGADA_PERMANENTE');
  });

  it('falha do geocoder (ex.: sem internet) → BUSCA_INDISPONIVEL', async () => {
    localizacaoDeTeste.geocodeAsync.mockRejectedValue(new Error('IOException: grpc failed'));

    expect(await motivoDaFalha(ios())).toBe('BUSCA_INDISPONIVEL');
  });

  it('geocoder que não responde dentro do limite → BUSCA_INDISPONIVEL', async () => {
    jest.useFakeTimers();
    localizacaoDeTeste.geocodeAsync.mockImplementation(() => new Promise(() => {}));

    const resultado = ios().buscar('Rua Augusta, 100').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_GPS_MS);

    expect(await resultado).toMatchObject({ motivo: 'BUSCA_INDISPONIVEL' });
  });

  it('resultado fora da faixa vira null em vez de gravar lixo', async () => {
    localizacaoDeTeste.resultadosDaBusca = [{ latitude: 200, longitude: 0 }];

    expect(await ios().buscar('Rua Augusta, 100')).toBeNull();
  });
});
