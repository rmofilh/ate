import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import type { ISyncGateway } from '../../core/application/gateways/ISyncGateway';
import type { TipoOperacao } from '../../core/domain/enums/TipoOperacao';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import { filaSync } from '../database/sqlite/schema';

/** Grava cada operação na fila outbox local (fila_sync). O envio é do Plano 4. */
export class OutboxSyncGateway implements ISyncGateway {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly ids: IIdGenerator,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  async enqueue(
    tipo: TipoOperacao,
    entidade: string,
    entidadeId: string,
    payload: string,
  ): Promise<void> {
    await this.db.insert(filaSync).values({
      id: this.ids.gerar(),
      tipoOperacao: tipo,
      entidade,
      entidadeId,
      payload,
      status: 'PENDENTE',
      tentativas: 0,
      criadoEmLocal: this.relogio().toISOString(),
    });
  }
}
