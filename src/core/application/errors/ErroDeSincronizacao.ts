/**
 * Como uma falha de envio ou leitura remota deve ser tratada pelo sync. Os adaptadores traduzem
 * os erros do servidor para um destes tipos; o caso de uso decide sem conhecer o SDK.
 * - SEM_REDE: sem conexão ou tempo esgotado. Para o ciclo; tenta de novo no próximo gatilho.
 * - TRANSITORIO: erro do servidor (5xx) ou dependência ainda não enviada (FK). Reagenda com backoff.
 * - PERMANENTE: o servidor recusou o dado (validação, CHECK, RLS). Falha visível ao artesão.
 * - SESSAO: sessão inválida ou expirada. Para o ciclo e pede login.
 */
export const TIPOS_ERRO_SYNC = ['SEM_REDE', 'TRANSITORIO', 'PERMANENTE', 'SESSAO'] as const;
export type TipoErroSync = (typeof TIPOS_ERRO_SYNC)[number];

export class ErroDeSincronizacao extends Error {
  constructor(
    readonly tipo: TipoErroSync,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Qualquer erro desconhecido conta como transitório: nunca descarta dado por um bug de rede. */
export function tipoDoErro(erro: unknown): TipoErroSync {
  return erro instanceof ErroDeSincronizacao ? erro.tipo : 'TRANSITORIO';
}

export function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}
