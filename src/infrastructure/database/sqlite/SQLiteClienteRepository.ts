import { and, eq, isNull } from 'drizzle-orm';

import type { IClienteRepository } from '../../../core/application/repositories/IClienteRepository';
import { Cliente } from '../../../core/domain/entities/Cliente';
import type { StatusSync } from '../../../core/domain/enums/StatusSync';
import type { DrizzleAppDb } from './DrizzleDb';
import { clientes } from './schema';

const NOME_BALCAO = 'Cliente Avulso';

export class SQLiteClienteRepository implements IClienteRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(cliente: Cliente): Promise<void> {
    const { id, ...resto } = paraLinha(cliente);
    await this.db
      .insert(clientes)
      .values({ id, ...resto })
      .onConflictDoUpdate({ target: clientes.id, set: resto });
  }

  async findById(id: string): Promise<Cliente | null> {
    const [linha] = await this.db
      .select()
      .from(clientes)
      .where(and(eq(clientes.id, id), isNull(clientes.deletedAt)));
    return linha ? paraEntidade(linha) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Cliente[]> {
    const linhas = await this.db
      .select()
      .from(clientes)
      .where(and(eq(clientes.usuarioId, usuarioId), isNull(clientes.deletedAt)))
      .orderBy(clientes.criadoEmLocal);
    return linhas.map(paraEntidade);
  }

  async findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null> {
    const [linha] = await this.db
      .select()
      .from(clientes)
      .where(
        and(
          eq(clientes.usuarioId, usuarioId),
          eq(clientes.nome, NOME_BALCAO),
          eq(clientes.contato, ''),
          isNull(clientes.deletedAt),
        ),
      );
    return linha ? paraEntidade(linha) : null;
  }

  /** O índice único parcial garante um único balcão vivo por usuário. */
  async saveBalcaoIfAbsent(cliente: Cliente): Promise<{ cliente: Cliente; created: boolean }> {
    await this.db.insert(clientes).values(paraLinha(cliente)).onConflictDoNothing();
    const balcao = await this.findBalcaoByUsuario(cliente.usuarioId);
    if (!balcao) throw new Error('Cliente balcão não encontrado após gravação');
    return { cliente: balcao, created: balcao.id === cliente.id };
  }
}

function paraLinha(c: Cliente): typeof clientes.$inferInsert {
  return {
    id: c.id,
    usuarioId: c.usuarioId,
    nome: c.nome,
    contato: c.contato,
    statusSync: c.statusSync,
    criadoEmLocal: c.criadoEmLocal.toISOString(),
    deletedAt: c.deletedAt?.toISOString() ?? null,
  };
}

function paraEntidade(l: typeof clientes.$inferSelect): Cliente {
  return Cliente.reidratar({
    id: l.id,
    usuarioId: l.usuarioId,
    nome: l.nome,
    contato: l.contato,
    statusSync: l.statusSync as StatusSync,
    criadoEmLocal: new Date(l.criadoEmLocal),
    deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
  });
}
