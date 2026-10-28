import {
  LocalizacaoIndisponivelError,
  MOTIVOS_LOCALIZACAO_INDISPONIVEL,
  type MotivoLocalizacaoIndisponivel,
} from '../errors/LocalizacaoIndisponivelError';

describe('LocalizacaoIndisponivelError', () => {
  it('lista os cinco motivos', () => {
    expect(MOTIVOS_LOCALIZACAO_INDISPONIVEL).toEqual([
      'NEGADA',
      'NEGADA_PERMANENTE',
      'SERVICO_DESLIGADO',
      'TIMEOUT',
      'BUSCA_INDISPONIVEL',
    ]);
  });

  it.each<[MotivoLocalizacaoIndisponivel, RegExp]>([
    ['NEGADA', /permissão de localização negada/i],
    ['NEGADA_PERMANENTE', /configurações/i],
    ['SERVICO_DESLIGADO', /ligue a localização/i],
    ['TIMEOUT', /não respondeu a tempo/i],
    ['BUSCA_INDISPONIVEL', /não foi possível buscar o endereço/i],
  ])('motivo %s tem mensagem em português e mantém o motivo', (motivo, mensagem) => {
    const erro = new LocalizacaoIndisponivelError(motivo);

    expect(erro.motivo).toBe(motivo);
    expect(erro.message).toMatch(mensagem);
    expect(erro.message).toMatch(/manualmente|no mapa/i);
  });

  it('é um Error com nome próprio e reconhecível por instanceof', () => {
    const erro = new LocalizacaoIndisponivelError('NEGADA');

    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(LocalizacaoIndisponivelError);
    expect(erro.name).toBe('LocalizacaoIndisponivelError');
  });
});
