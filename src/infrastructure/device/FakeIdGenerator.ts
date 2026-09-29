import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';

export class FakeIdGenerator implements IIdGenerator {
  private sequencia = 0;

  gerar(): string {
    this.sequencia += 1;
    return `00000000-0000-4000-8000-${this.sequencia.toString(16).padStart(12, '0')}`;
  }
}
