import { and, eq, isNull } from 'drizzle-orm';

import type { IPedidoRepository } from '../../../core/application/repositories/IPedidoRepository';
import { Pedido } from '../../../core/domain/entities/Pedido';
import type { CanalOrigem } from '../../../core/domain/enums/CanalOrigem';
import type { StatusPedido } from '../../../core/domain/enums/StatusPedido';
import type { StatusSync } from '../../../core/domain/enums/StatusSync';
import type { DrizzleAppDb } from './DrizzleDb';
import { pedidos } from './schema';

export class SQLitePedidoRepository implements IPedidoRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(pedido: Pedido): Promise<void> {
    const { id, ...resto } = paraLinha(pedido);
    await this.db
      .insert(pedidos)
      .values({ id, ...resto })
      .onConflictDoUpdate({ target: pedidos.id, set: resto });
  }

  async findById(id: string): Promise<Pedido | null> {
    const [linha] = await this.db
      .select()
      .from(pedidos)
      .where(and(eq(pedidos.id, id), isNull(pedidos.deletedAt)));
    return linha ? paraEntidade(linha) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Pedido[]> {
    const linhas = await this.db
      .select()
      .from(pedidos)
      .where(and(eq(pedidos.usuarioId, usuarioId), isNull(pedidos.deletedAt)))
      .orderBy(pedidos.criadoEmLocal);
    return linhas.map(paraEntidade);
  }

  async findByStatus(usuarioId: string, status: StatusPedido): Promise<Pedido[]> {
    const linhas = await this.db
      .select()
      .from(pedidos)
      .where(
        and(
          eq(pedidos.usuarioId, usuarioId),
          eq(pedidos.status, status),
          isNull(pedidos.deletedAt),
        ),
      )
      .orderBy(pedidos.criadoEmLocal);
    return linhas.map(paraEntidade);
  }
}

function paraLinha(p: Pedido): typeof pedidos.$inferInsert {
  return {
    id: p.id,
    usuarioId: p.usuarioId,
    clienteId: p.clienteId,
    obraId: p.obraId,
    descricao: p.descricao,
    canalOrigem: p.canalOrigem,
    dataEntrega: p.dataEntrega.toISOString(),
    status: p.status,
    fotoConclusaoPath: p.fotoConclusaoPath,
    vendaDireta: p.vendaDireta,
    quantidadeObra: p.quantidadeObra,
    statusSync: p.statusSync,
    criadoEmLocal: p.criadoEmLocal.toISOString(),
    deletedAt: p.deletedAt?.toISOString() ?? null,
  };
}

function paraEntidade(l: typeof pedidos.$inferSelect): Pedido {
  return Pedido.reidratar({
    id: l.id,
    usuarioId: l.usuarioId,
    clienteId: l.clienteId,
    obraId: l.obraId,
    descricao: l.descricao,
    canalOrigem: l.canalOrigem as CanalOrigem,
    dataEntrega: new Date(l.dataEntrega),
    status: l.status as StatusPedido,
    fotoConclusaoPath: l.fotoConclusaoPath,
    vendaDireta: l.vendaDireta,
    quantidadeObra: l.quantidadeObra,
    statusSync: l.statusSync as StatusSync,
    criadoEmLocal: new Date(l.criadoEmLocal),
    deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
  });
}
