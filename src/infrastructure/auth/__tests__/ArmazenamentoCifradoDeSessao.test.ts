import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

import { kvStoreDeTeste } from '../../../test-support/mocks/expoSqliteKvStore';
import { secureStoreDeTeste } from '../../../test-support/mocks/expoSecureStore';
import { ArmazenamentoCifradoDeSessao, type ArmazemChaveValor } from '../ArmazenamentoCifradoDeSessao';
import { CifradorAesGcm } from '../CifradorAesGcm';

const CHAVE = 'ate-auth';
const SESSAO = JSON.stringify({
  access_token: 'token-secreto',
  refresh_token: 'refresh-secreto',
  user: { id: 'a1111111-1111-4111-8111-111111111111', email: 'artesao@email.com' },
});

const cofre: ArmazemChaveValor = {
  getItem: (chave) => SecureStore.getItemAsync(chave),
  setItem: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  removeItem: (chave) => SecureStore.deleteItemAsync(chave),
};

describe('ArmazenamentoCifradoDeSessao (SecureStore + kv-store + AES-GCM)', () => {
  let armazenamento: ArmazenamentoCifradoDeSessao;

  beforeEach(() => {
    secureStoreDeTeste.limpar();
    kvStoreDeTeste.limpar();
    armazenamento = new ArmazenamentoCifradoDeSessao(cofre, Storage, new CifradorAesGcm());
  });

  it('grava e lê de volta o mesmo valor', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    await expect(armazenamento.getItem(CHAVE)).resolves.toBe(SESSAO);
  });

  it('o disco guarda só a cifra, nunca o texto claro', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const cifra = kvStoreDeTeste.valores().get(CHAVE) as string;
    expect(cifra).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(Buffer.from(cifra, 'base64').toString('utf8')).not.toContain('token-secreto');
  });

  it('a chave AES de 256 bits fica no SecureStore', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const chave = secureStoreDeTeste.valores().get(CHAVE) as string;
    expect(Buffer.from(chave, 'base64')).toHaveLength(32);
  });

  it('cada gravação usa uma chave nova', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const primeira = secureStoreDeTeste.valores().get(CHAVE);
    await armazenamento.setItem(CHAVE, SESSAO);
    expect(secureStoreDeTeste.valores().get(CHAVE)).not.toBe(primeira);
    await expect(armazenamento.getItem(CHAVE)).resolves.toBe(SESSAO);
  });

  it('removeItem apaga a chave e a cifra', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    await armazenamento.removeItem(CHAVE);
    expect(secureStoreDeTeste.valores().has(CHAVE)).toBe(false);
    expect(kvStoreDeTeste.valores().has(CHAVE)).toBe(false);
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
  });

  it('sem chave ou sem cifra devolve null', async () => {
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
    await armazenamento.setItem(CHAVE, SESSAO);
    secureStoreDeTeste.limpar();
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
  });

  it('chave e cifra de gravações diferentes (app morto no meio) viram "sem sessão" e são limpas', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const cifraAntiga = kvStoreDeTeste.valores().get(CHAVE) as string;
    await armazenamento.setItem(CHAVE, SESSAO);
    await Storage.setItem(CHAVE, cifraAntiga);

    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
    expect(secureStoreDeTeste.valores().has(CHAVE)).toBe(false);
    expect(kvStoreDeTeste.valores().has(CHAVE)).toBe(false);
  });

  it('cifra adulterada vira "sem sessão" (GCM autentica)', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const bytes = Buffer.from(kvStoreDeTeste.valores().get(CHAVE) as string, 'base64');
    bytes[20] ^= 0xff;
    await Storage.setItem(CHAVE, bytes.toString('base64'));

    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
  });
});
