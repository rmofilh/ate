export const MOTIVOS_LOCALIZACAO_INDISPONIVEL = [
  'NEGADA',
  'NEGADA_PERMANENTE',
  'SERVICO_DESLIGADO',
  'TIMEOUT',
  'BUSCA_INDISPONIVEL',
] as const;

export type MotivoLocalizacaoIndisponivel = (typeof MOTIVOS_LOCALIZACAO_INDISPONIVEL)[number];

const MENSAGENS: Record<MotivoLocalizacaoIndisponivel, string> = {
  NEGADA: 'Permissão de localização negada. Informe as coordenadas manualmente.',
  NEGADA_PERMANENTE:
    'Permissão de localização bloqueada. Libere nas configurações do aparelho ou informe as coordenadas manualmente.',
  SERVICO_DESLIGADO:
    'Ligue a localização do aparelho e tente de novo, ou informe as coordenadas manualmente.',
  TIMEOUT: 'O GPS não respondeu a tempo. Tente de novo ou informe as coordenadas manualmente.',
  BUSCA_INDISPONIVEL:
    'Não foi possível buscar o endereço agora. Verifique a internet ou posicione o pin no mapa.',
};

/**
 * Falha ao obter uma posição (GPS ou busca de endereço), na linguagem da aplicação. Os
 * adaptadores traduzem os estados do SDK para um destes motivos; a tela decide a ação sem
 * conhecer o SDK.
 */
export class LocalizacaoIndisponivelError extends Error {
  constructor(readonly motivo: MotivoLocalizacaoIndisponivel) {
    super(MENSAGENS[motivo]);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
