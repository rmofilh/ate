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
    ...jest.requireActual('./src/test-support/mocks/expoCryptoAes'),
  };
});

jest.mock('expo-file-system', () => jest.requireActual('./src/test-support/mocks/expoFileSystem'));
jest.mock('expo-image-manipulator', () =>
  jest.requireActual('./src/test-support/mocks/expoImageManipulator'),
);
jest.mock('expo-camera', () => jest.requireActual('./src/test-support/mocks/expoCamera'));
jest.mock('expo-location', () => jest.requireActual('./src/test-support/mocks/expoLocation'));
jest.mock('expo-secure-store', () => jest.requireActual('./src/test-support/mocks/expoSecureStore'));
jest.mock('expo-sqlite/kv-store', () => jest.requireActual('./src/test-support/mocks/expoSqliteKvStore'));
jest.mock('expo-network', () => jest.requireActual('./src/test-support/mocks/expoNetwork'));
jest.mock('@maplibre/maplibre-react-native', () => jest.requireActual('./src/test-support/mocks/maplibre'));
// No Jest não há módulo nativo: o carregador devolve o dublê, ou null para simular o Expo Go.
jest.mock('./src/infrastructure/device/mapa/mapLibre', () => {
  const real = jest.requireActual('./src/infrastructure/device/mapa/mapLibre');
  return {
    ...real,
    carregarMapLibre: () => {
      const dublê = jest.requireActual('./src/test-support/mocks/maplibre');
      return dublê.mapLibreDeTeste.disponivel ? dublê : null;
    },
  };
});
