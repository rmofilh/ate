import type { ISyncGateway } from '../../core/application/gateways/ISyncGateway';
import type { TipoOperacao } from '../../core/domain/enums/TipoOperacao';

export class FakeSyncGateway implements ISyncGateway {
  readonly queue: Array<{
    tipo: TipoOperacao;
    entidade: string;
    entidadeId: string;
    payload: string;
  }> = [];

  async enqueue(
    tipo: TipoOperacao,
    entidade: string,
    entidadeId: string,
    payload: string,
  ): Promise<void> {
    this.queue.push({ tipo, entidade, entidadeId, payload });
  }
}
