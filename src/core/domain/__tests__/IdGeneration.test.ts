const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('geração de IDs no dispositivo', () => {
  it('gera UUID v4 quando o runtime inicia sem Web Crypto', () => {
    const cryptoOriginal = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const avisoFallback = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      jest.isolateModules(() => {
        const { Cliente } = require('../entities/Cliente') as typeof import('../entities/Cliente');
        const cliente = Cliente.criar({
          usuarioId: 'a1111111-1111-4111-8111-111111111111',
          nome: 'João',
          contato: 'x',
        });

        expect(cliente.id).toMatch(UUID_V4);
      });
    } finally {
      if (cryptoOriginal) {
        Object.defineProperty(globalThis, 'crypto', cryptoOriginal);
      } else {
        Reflect.deleteProperty(globalThis, 'crypto');
      }
      avisoFallback.mockRestore();
    }
  });
});
