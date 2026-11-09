import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';

import type { Cifrador } from './ArmazenamentoCifradoDeSessao';

/** AES-256-GCM nativo do expo-crypto. Chave e cifra em base64; a cifra leva IV + texto + tag. */
export class CifradorAesGcm implements Cifrador {
  async gerarChave(): Promise<string> {
    const chave = await AESEncryptionKey.generate();
    return chave.encoded('base64');
  }

  async cifrar(texto: string, chave: string): Promise<string> {
    const chaveAes = await AESEncryptionKey.import(chave, 'base64');
    const selado = await aesEncryptAsync(new TextEncoder().encode(texto), chaveAes);
    return selado.combined('base64');
  }

  async decifrar(cifra: string, chave: string): Promise<string> {
    const chaveAes = await AESEncryptionKey.import(chave, 'base64');
    const selado = AESSealedData.fromCombined(cifra);
    const bytes = await aesDecryptAsync(selado, chaveAes);
    return new TextDecoder().decode(bytes);
  }
}
