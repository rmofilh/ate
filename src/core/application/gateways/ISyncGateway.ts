import type { TipoOperacao } from '../../domain/enums/TipoOperacao';

export interface ISyncGateway {
  enqueue(
    tipo: TipoOperacao,
    entidade: string,
    entidadeId: string,
    payload: string,
  ): Promise<void>;
}
