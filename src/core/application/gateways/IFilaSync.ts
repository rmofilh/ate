import type { EntradaFila, ResumoSync } from '../sync/tipos';

/** Outbox local (fila_sync) do ponto de vista do sync. */
export interface IFilaSync {
  /** Entradas PENDENTE cuja próxima tentativa já venceu (ou nunca foi agendada). */
  elegiveis(agora: Date): Promise<EntradaFila[]>;
  /** Remove as entradas enviadas com sucesso. */
  concluir(ids: string[]): Promise<void>;
  /** Mantém PENDENTE, soma uma tentativa e agenda a próxima. */
  reagendar(ids: string[], proximaEm: Date, erro: string): Promise<void>;
  /** Marca FALHA (o servidor recusou): só volta com `reenviarFalhas`. */
  falhar(ids: string[], erro: string): Promise<void>;
  /** Ainda há operação na fila para esta linha (ex.: editada durante o envio)? */
  temPendente(entidade: string, entidadeId: string): Promise<boolean>;
  /** FALHA → PENDENTE, para o artesão tentar de novo. Devolve quantas voltaram. */
  reenviarFalhas(): Promise<number>;
  resumo(): Promise<ResumoSync>;
}
