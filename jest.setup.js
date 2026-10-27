jest.mock('expo-crypto', () => {
  const { createHash } = jest.requireActual('crypto');
  let sequencia = 0;
  return {
    getRandomBytes: jest.fn((tamanho) => {
      sequencia += 1;
      const bytes = new Uint8Array(tamanho);
      bytes[12] = (sequencia >>> 24) & 255;
      bytes[13] = (sequencia >>> 16) & 255;
      bytes[14] = (sequencia >>> 8) & 255;
      bytes[15] = sequencia & 255;
      return bytes;
    }),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digest: jest.fn(async (_algoritmo, dados) => {
      const resumo = createHash('sha256').update(Buffer.from(dados)).digest();
      return resumo.buffer.slice(resumo.byteOffset, resumo.byteOffset + resumo.byteLength);
    }),
  };
});

jest.mock('expo-file-system', () => jest.requireActual('./src/test-support/mocks/expoFileSystem'));
jest.mock('expo-image-manipulator', () =>
  jest.requireActual('./src/test-support/mocks/expoImageManipulator'),
);
