import { eq } from 'drizzle-orm';

import { LocalizacaoIndisponivelError } from '../../../core/application/errors/LocalizacaoIndisponivelError';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
import type { DrizzleAppDb } from '../../../infrastructure/database/sqlite/DrizzleDb';
import { ExecutorDeTransacao } from '../../../infrastructure/database/sqlite/ExecutorDeTransacao';
import { eventos, filaSync } from '../../../infrastructure/database/sqlite/schema';
import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import {
  localizacaoDeTeste,
  permissoesDeLocalizacao,
} from '../../../test-support/mocks/expoLocation';
import { makeSqliteProviders, type SqliteProviderBag } from '../makeSqliteProviders';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const DADOS_DO_EVENTO = {
  usuarioId: USUARIO,
  nome: 'Feira da Vila',
  data: new Date('2026-12-05T12:00:00.000Z'),
  endereco: 'Praça Benedito Calixto',
};

/**
 * Ponta a ponta da geolocalização: SDK (expo-location dublado) → ExpoLocationGateway ou
 * ExpoGeocodingGateway → caso de uso transacional → SQLite real em memória, com a entrada
 * na fila outbox.
 */
describe('geolocalização salva no banco local', () => {
  let db: DrizzleAppDb;
  let bag: SqliteProviderBag;

  beforeEach(() => {
    localizacaoDeTeste.reiniciar();
    db = bancoDeTeste();
    bag = makeSqliteProviders(db, new ExecutorDeTransacao(db));
    bag.registrarSessao({ userId: USUARIO, token: 'x' });
  });

  async function linhaDoEvento(id: string) {
    const [linha] = await db.select().from(eventos).where(eq(eventos.id, id));
    return linha;
  }

  async function fila() {
    return (await db.select().from(filaSync)).map((l) => `${l.tipoOperacao} ${l.entidade} ${l.entidadeId}`);
  }

  it('coordenada lida do GPS (fluxo da tela) é gravada no SQLite e enfileirada', async () => {
    const ponto = await bag.gateways.location.getCurrent();
    const evento = await bag.useCases.cadastrarEvento.execute({ ...DADOS_DO_EVENTO, localizacao: ponto });

    const linha = await linhaDoEvento(evento.id);
    expect(linha.latitude).toBe(-23.5617);
    expect(linha.longitude).toBe(-46.6559);
    expect(linha.statusSync).toBe('PENDENTE');
    expect(await fila()).toEqual([`CRIAR Evento ${evento.id}`]);
  });

  it('coordenada da busca de endereço (geocoder) é gravada no SQLite e enfileirada', async () => {
    localizacaoDeTeste.resultadosDaBusca = [{ latitude: -23.5611, longitude: -46.6822 }];

    const ponto = await bag.gateways.geocodificador.buscar(DADOS_DO_EVENTO.endereco);
    expect(ponto).not.toBeNull();
    const evento = await bag.useCases.cadastrarEvento.execute({
      ...DADOS_DO_EVENTO,
      localizacao: ponto ?? undefined,
    });

    const linha = await linhaDoEvento(evento.id);
    expect([linha.latitude, linha.longitude]).toEqual([-23.5611, -46.6822]);
    expect(await fila()).toEqual([`CRIAR Evento ${evento.id}`]);
  });

  it('endereço não encontrado não grava nada sozinho: o evento exige um ponto', async () => {
    localizacaoDeTeste.resultadosDaBusca = [];

    const ponto = await bag.gateways.geocodificador.buscar('lugar inexistente');

    expect(ponto).toBeNull();
    await expect(
      bag.useCases.cadastrarEvento.execute({ ...DADOS_DO_EVENTO, localizacao: ponto ?? undefined }),
    ).rejects.toThrow(/obrigatoria/i);
    expect(await db.select().from(eventos)).toEqual([]);
  });

  it('caso de uso com usarGps também grava a coordenada do aparelho', async () => {
    const evento = await bag.useCases.cadastrarEvento.execute({ ...DADOS_DO_EVENTO, usarGps: true });

    const linha = await linhaDoEvento(evento.id);
    expect([linha.latitude, linha.longitude]).toEqual([-23.5617, -46.6559]);
  });

  it('a coordenada gravada volta igual pelo repositório e pelo loadData', async () => {
    const evento = await bag.useCases.cadastrarEvento.execute({ ...DADOS_DO_EVENTO, usarGps: true });

    const relido = await bag.repositories.eventos.findById(evento.id);
    expect(relido?.localizacao).toBeInstanceOf(Coordenada);
    expect(relido?.localizacao).toEqual(evento.localizacao);
    const dados = await bag.loadData();
    expect(dados.eventos.map((e) => e.localizacao)).toEqual([evento.localizacao]);
  });

  it('permissão negada não grava evento nem entrada na fila', async () => {
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.negada;

    await expect(
      bag.useCases.cadastrarEvento.execute({ ...DADOS_DO_EVENTO, usarGps: true }),
    ).rejects.toBeInstanceOf(LocalizacaoIndisponivelError);

    expect(await db.select().from(eventos)).toEqual([]);
    expect(await fila()).toEqual([]);
  });

  it('atualizar a localização pelo GPS na edição troca a coordenada e enfileira EDITAR', async () => {
    const evento = await bag.useCases.cadastrarEvento.execute({
      ...DADOS_DO_EVENTO,
      localizacao: new Coordenada(-23.5, -46.6),
    });
    localizacaoDeTeste.proximaPosicao = {
      coords: { latitude: -22.9068, longitude: -43.1729, accuracy: 8 },
      timestamp: 0,
    };

    const novoPonto = await bag.gateways.location.getCurrent();
    await bag.useCases.editarEvento.execute({
      eventoId: evento.id,
      nome: evento.nome,
      data: evento.data,
      endereco: evento.endereco,
      localizacao: novoPonto,
      observacoes: evento.observacoes,
    });

    const linha = await linhaDoEvento(evento.id);
    expect([linha.latitude, linha.longitude]).toEqual([-22.9068, -43.1729]);
    expect(await fila()).toEqual([`CRIAR Evento ${evento.id}`, `EDITAR Evento ${evento.id}`]);
  });
});
