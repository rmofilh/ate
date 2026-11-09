import { type EntradaFila, TABELAS_SYNC, type TabelaSync, tabelaDaEntidade } from './tipos';

/** Todas as entradas da fila de uma mesma linha: viram um único envio do estado atual. */
export interface GrupoDeEnvio {
  tabela: TabelaSync;
  entidadeId: string;
  entradas: EntradaFila[];
}

/**
 * Coalescência e ordem do push: entradas da mesma linha viram um grupo (o estado atual é relido
 * do banco, então basta um envio); grupos saem pai antes de filho e, na mesma tabela, pela
 * ordem da primeira operação. Entradas de entidade desconhecida ficam de fora.
 */
export function organizarFila(entradas: EntradaFila[]): GrupoDeEnvio[] {
  const grupos = new Map<string, GrupoDeEnvio>();
  const ordenadas = [...entradas].sort((a, b) => a.criadoEmLocal.localeCompare(b.criadoEmLocal));
  for (const entrada of ordenadas) {
    const tabela = tabelaDaEntidade(entrada.entidade);
    if (!tabela) continue;
    const chave = `${tabela}:${entrada.entidadeId}`;
    const grupo = grupos.get(chave) ?? { tabela, entidadeId: entrada.entidadeId, entradas: [] };
    grupo.entradas.push(entrada);
    grupos.set(chave, grupo);
  }
  const posicao = (tabela: TabelaSync) => TABELAS_SYNC.indexOf(tabela);
  return [...grupos.values()].sort(
    (a, b) =>
      posicao(a.tabela) - posicao(b.tabela) ||
      a.entradas[0].criadoEmLocal.localeCompare(b.entradas[0].criadoEmLocal),
  );
}
