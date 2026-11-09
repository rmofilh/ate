/** Tabelas sincronizadas, na ordem pai → filho (pedidos dependem de clientes e obras). */
export const TABELAS_SYNC = ['clientes', 'obras', 'pedidos', 'eventos'] as const;
export type TabelaSync = (typeof TABELAS_SYNC)[number];

const TABELA_POR_ENTIDADE: Record<string, TabelaSync> = {
  Cliente: 'clientes',
  Obra: 'obras',
  Pedido: 'pedidos',
  Evento: 'eventos',
};

/** Nome da entidade gravado na fila (`Cliente`, `Pedido`...) → tabela sincronizada. */
export function tabelaDaEntidade(entidade: string): TabelaSync | null {
  return TABELA_POR_ENTIDADE[entidade] ?? null;
}

/**
 * Posição do pull numa tabela: maior (updated_at, id) do servidor já aplicado. O `updatedAt` é a
 * string do servidor, sem conversão: o Postgres guarda microssegundos e Date só milissegundos.
 */
export interface Cursor {
  updatedAt: string;
  id: string;
}

export interface EntradaFila {
  id: string;
  entidade: string;
  entidadeId: string;
  tentativas: number;
  criadoEmLocal: string;
}

/** Linha local pronta para o servidor (formato remoto montado pela infraestrutura). */
export interface RegistroParaEnvio {
  tabela: TabelaSync;
  id: string;
  dados: Record<string, unknown>;
  /** A foto do registro ainda não subiu: storage-first, o registro espera o próximo ciclo. */
  aguardandoFoto: boolean;
}

/** Linha vinda do servidor no pull. */
export interface LinhaRemota {
  id: string;
  updatedAt: string;
  dados: Record<string, unknown>;
}

export interface FotoParaEnviar {
  id: string;
  caminhoLocal: string;
}

export interface FotoParaBaixar {
  caminhoLocal: string;
  caminhoRemoto: string;
}

export interface ResumoSync {
  pendentes: number;
  falhas: number;
}

export interface ResultadoSync {
  fotosEnviadas: number;
  enviados: number;
  falhas: number;
  recebidos: number;
  fotosBaixadas: number;
  /** O ciclo parou por falta de rede (o resto fica para o próximo gatilho). */
  semRede: boolean;
  /** O servidor recusou a sessão: é preciso entrar de novo. */
  sessaoExpirada: boolean;
  /** Falha inesperada ao trazer mudanças (o cursor não avançou; tenta de novo no próximo ciclo). */
  erroNoPull?: string;
}

export function resultadoVazio(): ResultadoSync {
  return {
    fotosEnviadas: 0,
    enviados: 0,
    falhas: 0,
    recebidos: 0,
    fotosBaixadas: 0,
    semRede: false,
    sessaoExpirada: false,
  };
}
