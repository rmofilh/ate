import { getRandomBytes } from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';

export class UuidIdGenerator implements IIdGenerator {
  gerar(): string {
    return uuidv4({ random: getRandomBytes(16) });
  }
}
