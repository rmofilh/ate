/** Armazenamento de arquivos remoto (bucket privado). Falhas chegam como ErroDeSincronizacao. */
export interface IArmazenamentoRemoto {
  /** Envia o arquivo local; reenviar o mesmo caminho substitui (idempotente). */
  enviar(caminhoLocal: string, caminhoRemoto: string): Promise<void>;
  baixar(caminhoRemoto: string, caminhoLocal: string): Promise<void>;
}
