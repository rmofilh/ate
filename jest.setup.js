jest.mock('expo-crypto', () => {
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
  };
});
