/** Dublê em memória do expo-secure-store (SDK 58). Rejeita chaves com caracteres inválidos, como o real. */
const valores = new Map<string, string>();

function validarChave(chave: string): void {
  if (!/^[\w.-]+$/.test(chave)) throw new Error(`Invalid key provided to SecureStore: ${chave}`);
}

export async function getItemAsync(chave: string): Promise<string | null> {
  validarChave(chave);
  return valores.get(chave) ?? null;
}

export async function setItemAsync(chave: string, valor: string): Promise<void> {
  validarChave(chave);
  valores.set(chave, valor);
}

export async function deleteItemAsync(chave: string): Promise<void> {
  validarChave(chave);
  valores.delete(chave);
}

export const secureStoreDeTeste = {
  valores: (): Map<string, string> => new Map(valores),
  limpar: (): void => valores.clear(),
};
