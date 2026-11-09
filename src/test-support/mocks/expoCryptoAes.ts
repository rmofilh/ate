/**
 * Dublê do AES-GCM do expo-crypto (SDK 58) com o AES-256-GCM real do Node.
 * Mesmo formato do nativo: chave em base64, `combined` = IV (12) + texto cifrado + tag (16).
 */
import {
  type CipherGCM,
  type CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  type DecipherGCM,
  randomBytes,
} from 'crypto';

const IV = 12;
const TAG = 16;

function algoritmo(chave: AESEncryptionKey): CipherGCMTypes {
  return `aes-${chave.bytesDaChave.length * 8}-gcm` as CipherGCMTypes;
}

export class AESEncryptionKey {
  private constructor(readonly bytesDaChave: Buffer) {}

  static async generate(): Promise<AESEncryptionKey> {
    return new AESEncryptionKey(randomBytes(32));
  }

  static async import(valor: string | Uint8Array, codificacao?: 'hex' | 'base64'): Promise<AESEncryptionKey> {
    const bytes = typeof valor === 'string' ? Buffer.from(valor, codificacao ?? 'hex') : Buffer.from(valor);
    if (![16, 24, 32].includes(bytes.length)) throw new Error('Tamanho de chave AES inválido');
    return new AESEncryptionKey(bytes);
  }

  async encoded(codificacao: 'hex' | 'base64'): Promise<string> {
    return this.bytesDaChave.toString(codificacao);
  }

  async bytes(): Promise<Uint8Array> {
    return new Uint8Array(this.bytesDaChave);
  }
}

export class AESSealedData {
  private constructor(readonly combinado: Buffer) {}

  static fromCombined(combinado: string | Uint8Array): AESSealedData {
    const bytes = typeof combinado === 'string' ? Buffer.from(combinado, 'base64') : Buffer.from(combinado);
    return new AESSealedData(bytes);
  }

  static deBytes(bytes: Buffer): AESSealedData {
    return new AESSealedData(bytes);
  }

  async combined(codificacao: 'base64' | 'bytes' = 'bytes'): Promise<string | Uint8Array> {
    return codificacao === 'base64' ? this.combinado.toString('base64') : new Uint8Array(this.combinado);
  }
}

function emBytes(entrada: string | Uint8Array | ArrayBuffer): Buffer {
  if (typeof entrada === 'string') return Buffer.from(entrada, 'base64');
  return Buffer.from(entrada instanceof ArrayBuffer ? new Uint8Array(entrada) : entrada);
}

export async function aesEncryptAsync(
  texto: string | Uint8Array | ArrayBuffer,
  chave: AESEncryptionKey,
): Promise<AESSealedData> {
  const iv = randomBytes(IV);
  const cifra: CipherGCM = createCipheriv(algoritmo(chave), chave.bytesDaChave, iv);
  const corpo = Buffer.concat([cifra.update(emBytes(texto)), cifra.final()]);
  return AESSealedData.deBytes(Buffer.concat([iv, corpo, cifra.getAuthTag()]));
}

export async function aesDecryptAsync(
  selado: AESSealedData,
  chave: AESEncryptionKey,
  opcoes?: { output?: 'base64' | 'bytes' },
): Promise<string | Uint8Array> {
  const dados = selado.combinado;
  const iv = dados.subarray(0, IV);
  const tag = dados.subarray(dados.length - TAG);
  const corpo = dados.subarray(IV, dados.length - TAG);
  const decifra: DecipherGCM = createDecipheriv(algoritmo(chave), chave.bytesDaChave, iv);
  decifra.setAuthTag(tag);
  const texto = Buffer.concat([decifra.update(corpo), decifra.final()]);
  return opcoes?.output === 'base64' ? texto.toString('base64') : new Uint8Array(texto);
}
