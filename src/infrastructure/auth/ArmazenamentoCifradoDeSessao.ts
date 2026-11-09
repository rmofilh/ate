/** Formato de storage que o supabase-js aceita em `auth.storage`. */
export interface ArmazenamentoDeSessao {
  getItem(chave: string): Promise<string | null>;
  setItem(chave: string, valor: string): Promise<void>;
  removeItem(chave: string): Promise<void>;
}

/** Armazém chave/valor assíncrono (SecureStore, kv-store do expo-sqlite ou dublê). */
export interface ArmazemChaveValor {
  getItem(chave: string): Promise<string | null>;
  setItem(chave: string, valor: string): Promise<void>;
  removeItem(chave: string): Promise<void>;
}

/** Cifra autenticada: decifrar com a chave errada ou cifra adulterada lança erro. */
export interface Cifrador {
  gerarChave(): Promise<string>;
  cifrar(texto: string, chave: string): Promise<string>;
  decifrar(cifra: string, chave: string): Promise<string>;
}

/**
 * Padrão LargeSecureStore do guia do Supabase para Expo. A sessão passa do limite prático
 * de ~2 KB do SecureStore, então cada gravação gera uma chave AES-256 nova, guardada no
 * SecureStore (cofre), e a sessão cifrada vai para o disco (kv-store do expo-sqlite).
 * Nunca há texto claro fora do cofre.
 */
export class ArmazenamentoCifradoDeSessao implements ArmazenamentoDeSessao {
  constructor(
    private readonly cofre: ArmazemChaveValor,
    private readonly disco: ArmazemChaveValor,
    private readonly cifrador: Cifrador,
  ) {}

  async getItem(chave: string): Promise<string | null> {
    const [cifra, chaveAes] = await Promise.all([
      this.disco.getItem(chave),
      this.cofre.getItem(chave),
    ]);
    if (!cifra || !chaveAes) return null;
    try {
      return await this.cifrador.decifrar(cifra, chaveAes);
    } catch {
      // Chave e cifra de gravações diferentes (app morto no meio) ou dado corrompido.
      await this.removeItem(chave);
      return null;
    }
  }

  async setItem(chave: string, valor: string): Promise<void> {
    const chaveAes = await this.cifrador.gerarChave();
    const cifra = await this.cifrador.cifrar(valor, chaveAes);
    await this.cofre.setItem(chave, chaveAes);
    await this.disco.setItem(chave, cifra);
  }

  async removeItem(chave: string): Promise<void> {
    await Promise.all([this.disco.removeItem(chave), this.cofre.removeItem(chave)]);
  }
}
