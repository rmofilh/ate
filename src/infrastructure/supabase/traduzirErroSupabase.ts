import { ErroDeSincronizacao } from '../../core/application/errors/ErroDeSincronizacao';

interface FalhaRemota {
  status?: number;
  code?: string;
  message?: string;
}

const REDE = /network|fetch|timed? ?out|tempo esgotado|abort|offline|connection/i;

/**
 * Erro do PostgREST ou do Storage → linguagem do sync. Ordem importa: sessão antes de "4xx"
 * genérico; FK (23503) é transitório porque o pai pode ainda não ter subido (ex.: obra
 * esperando a própria foto).
 */
export function traduzirErroSupabase(falha: FalhaRemota | null | undefined): ErroDeSincronizacao {
  const status = falha?.status ?? 0;
  const code = falha?.code ?? '';
  const mensagem = falha?.message || 'Erro desconhecido do servidor';

  if (status === 0 && (REDE.test(mensagem) || !code)) {
    return new ErroDeSincronizacao('SEM_REDE', mensagem);
  }
  if (status === 401 || code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(mensagem)) {
    return new ErroDeSincronizacao('SESSAO', mensagem);
  }
  if (code === '23503') return new ErroDeSincronizacao('TRANSITORIO', mensagem);
  if (status === 408 || status === 429 || status >= 500) {
    return new ErroDeSincronizacao('TRANSITORIO', mensagem);
  }
  if (status >= 400) return new ErroDeSincronizacao('PERMANENTE', mensagem);
  return new ErroDeSincronizacao('TRANSITORIO', mensagem);
}

/** Exceção lançada (fetch rejeitado, tempo esgotado): sempre falta de rede. */
export function erroDeRede(erro: unknown): ErroDeSincronizacao {
  if (erro instanceof ErroDeSincronizacao) return erro;
  return new ErroDeSincronizacao('SEM_REDE', erro instanceof Error ? erro.message : String(erro));
}
