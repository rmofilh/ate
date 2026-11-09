import type {
  Cursor,
  FotoParaBaixar,
  FotoParaEnviar,
  LinhaRemota,
  RegistroParaEnvio,
  TabelaSync,
} from '../sync/tipos';

/** Banco local do ponto de vista do sync: leitura para envio, aplicação do pull e fotos. */
export interface IEstadoLocalSync {
  /** Estado atual da linha (inclui tombstone) no formato do servidor; null se não existe. */
  lerParaEnvio(tabela: TabelaSync, id: string): Promise<RegistroParaEnvio | null>;
  marcarSincronizado(tabela: TabelaSync, id: string, updatedAtServidor: string): Promise<void>;
  marcarErro(tabela: TabelaSync, id: string): Promise<void>;
  /** Linhas ERRO voltam a PENDENTE (acompanha `reenviarFalhas` da fila). */
  reenviarErros(): Promise<void>;

  cursor(tabela: TabelaSync): Promise<Cursor | null>;
  /**
   * Aplica um lote do pull e avança o cursor numa única transação. Linhas locais PENDENTE/ERRO
   * não são sobrescritas (o push delas vem antes; depois do push, o servidor vence).
   * Devolve quantas linhas foram aplicadas.
   */
  aplicarLote(tabela: TabelaSync, linhas: LinhaRemota[]): Promise<number>;

  /** Fotos PENDENTE_UPLOAD que algum registro usa. */
  fotosParaEnviar(): Promise<FotoParaEnviar[]>;
  marcarFotoEnviada(id: string, caminhoRemoto: string): Promise<void>;
  marcarFalhaDaFoto(id: string, erro: string): Promise<void>;
  /** Fotos conhecidas pelo servidor cujo arquivo não está no aparelho (ex.: reinstalação). */
  fotosParaBaixar(): Promise<FotoParaBaixar[]>;
}
