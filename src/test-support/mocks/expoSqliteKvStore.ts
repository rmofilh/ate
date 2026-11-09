/** Dublê em memória do `expo-sqlite/kv-store` (SDK 58). */
const valores = new Map<string, string>();

const Storage = {
  async getItem(chave: string): Promise<string | null> {
    return valores.get(chave) ?? null;
  },
  async setItem(chave: string, valor: string): Promise<void> {
    valores.set(chave, valor);
  },
  async removeItem(chave: string): Promise<void> {
    valores.delete(chave);
  },
};

export { Storage };
export default Storage;

export const kvStoreDeTeste = {
  valores: (): Map<string, string> => new Map(valores),
  limpar: (): void => valores.clear(),
};
