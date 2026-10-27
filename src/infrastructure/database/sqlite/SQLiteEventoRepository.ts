import { and, eq, isNull } from 'drizzle-orm';

import type { IEventoRepository } from '../../../core/application/repositories/IEventoRepository';
import { Evento } from '../../../core/domain/entities/Evento';
import type { StatusSync } from '../../../core/domain/enums/StatusSync';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
import type { DrizzleAppDb } from './DrizzleDb';
import { eventos } from './schema';

export class SQLiteEventoRepository implements IEventoRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(evento: Evento): Promise<void> {
    const { id, ...resto } = paraLinha(evento);
    await this.db
      .insert(eventos)
      .values({ id, ...resto })
      .onConflictDoUpdate({ target: eventos.id, set: resto });
  }

  async findById(id: string): Promise<Evento | null> {
    const [linha] = await this.db
      .select()
      .from(eventos)
      .where(and(eq(eventos.id, id), isNull(eventos.deletedAt)));
    return linha ? paraEntidade(linha) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Evento[]> {
    const linhas = await this.db
      .select()
      .from(eventos)
      .where(and(eq(eventos.usuarioId, usuarioId), isNull(eventos.deletedAt)))
      .orderBy(eventos.criadoEmLocal);
    return linhas.map(paraEntidade);
  }
}

function paraLinha(e: Evento): typeof eventos.$inferInsert {
  return {
    id: e.id,
    usuarioId: e.usuarioId,
    nome: e.nome,
    data: e.data.toISOString(),
    endereco: e.endereco,
    latitude: e.localizacao.latitude,
    longitude: e.localizacao.longitude,
    observacoes: e.observacoes,
    statusSync: e.statusSync,
    criadoEmLocal: e.criadoEmLocal.toISOString(),
    deletedAt: e.deletedAt?.toISOString() ?? null,
  };
}

function paraEntidade(l: typeof eventos.$inferSelect): Evento {
  return Evento.reidratar({
    id: l.id,
    usuarioId: l.usuarioId,
    nome: l.nome,
    data: new Date(l.data),
    endereco: l.endereco,
    localizacao: new Coordenada(l.latitude, l.longitude),
    observacoes: l.observacoes,
    statusSync: l.statusSync as StatusSync,
    criadoEmLocal: new Date(l.criadoEmLocal),
    deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
  });
}
