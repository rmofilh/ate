import { and, eq, isNull } from 'drizzle-orm';

import type { IObraRepository } from '../../../core/application/repositories/IObraRepository';
import { Obra } from '../../../core/domain/entities/Obra';
import type { StatusObra } from '../../../core/domain/enums/StatusObra';
import type { StatusSync } from '../../../core/domain/enums/StatusSync';
import type { TipoObra } from '../../../core/domain/enums/TipoObra';
import type { DrizzleAppDb } from './DrizzleDb';
import { obras } from './schema';

export class SQLiteObraRepository implements IObraRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(obra: Obra): Promise<void> {
    const { id, ...resto } = paraLinha(obra);
    await this.db
      .insert(obras)
      .values({ id, ...resto })
      .onConflictDoUpdate({ target: obras.id, set: resto });
  }

  async findById(id: string): Promise<Obra | null> {
    const [linha] = await this.db
      .select()
      .from(obras)
      .where(and(eq(obras.id, id), isNull(obras.deletedAt)));
    return linha ? paraEntidade(linha) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Obra[]> {
    const linhas = await this.db
      .select()
      .from(obras)
      .where(and(eq(obras.usuarioId, usuarioId), isNull(obras.deletedAt)))
      .orderBy(obras.criadoEmLocal);
    return linhas.map(paraEntidade);
  }
}

function paraLinha(o: Obra): typeof obras.$inferInsert {
  return {
    id: o.id,
    usuarioId: o.usuarioId,
    nome: o.nome,
    tipo: o.tipo,
    quantidade: o.quantidade,
    statusObra: o.statusObra,
    fotoPath: o.fotoPath,
    statusSync: o.statusSync,
    criadoEmLocal: o.criadoEmLocal.toISOString(),
    deletedAt: o.deletedAt?.toISOString() ?? null,
  };
}

function paraEntidade(l: typeof obras.$inferSelect): Obra {
  return Obra.reidratar({
    id: l.id,
    usuarioId: l.usuarioId,
    nome: l.nome,
    tipo: l.tipo as TipoObra,
    quantidade: l.quantidade,
    statusObra: l.statusObra as StatusObra,
    fotoPath: l.fotoPath,
    statusSync: l.statusSync as StatusSync,
    criadoEmLocal: new Date(l.criadoEmLocal),
    deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
  });
}
