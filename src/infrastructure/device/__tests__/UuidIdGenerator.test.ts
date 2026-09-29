import { getRandomBytes } from 'expo-crypto';
import { UuidIdGenerator } from '../UuidIdGenerator';

it('gera UUID v4 com 16 bytes nativos mesmo sem globalThis.crypto', () => {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try {
    const id = new UuidIdGenerator().gerar();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(getRandomBytes).toHaveBeenCalledWith(16);
  } finally {
    if (anterior) Object.defineProperty(globalThis, 'crypto', anterior);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});
