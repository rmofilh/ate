import { eq } from 'drizzle-orm';

import type { DrizzleAppDb } from './DrizzleDb';
import { clientes, eventos, filaSync, fotos, obras, pedidos, syncMeta } from './schema';

export const CHAVE_DONO = 'dono_dos_dados';

/**
 * Conta dona dos dados deste aparelho (D4). Vem de sync_meta; sem registro, vale o usuario_id
 * de qualquer linha local (cobre os dados criados antes do login real, inclusive tombstones).
 */
export class DonoDosDadosLocais {
  constructor(private readonly db: DrizzleAppDb) {}

  async ler(): Promise<string | null> {
    const [registrado] = await this.db.select().from(syncMeta).where(eq(syncMeta.chave, CHAVE_DONO));
    if (registrado) return registrado.valor;
    // Uma consulta por tabela (um laço sobre a união das tabelas confunde os tipos do Drizzle).
    const consultas = [
      () => this.db.select({ usuarioId: clientes.usuarioId }).from(clientes).limit(1),
      () => this.db.select({ usuarioId: obras.usuarioId }).from(obras).limit(1),
      () => this.db.select({ usuarioId: pedidos.usuarioId }).from(pedidos).limit(1),
      () => this.db.select({ usuarioId: eventos.usuarioId }).from(eventos).limit(1),
    ];
    for (const consultar of consultas) {
      const [linha] = await consultar();
      if (linha) return linha.usuarioId;
    }
    return null;
  }

  async registrar(usuarioId: string): Promise<void> {
    await this.db
      .insert(syncMeta)
      .values({ chave: CHAVE_DONO, valor: usuarioId })
      .onConflictDoUpdate({ target: syncMeta.chave, set: { valor: usuarioId } });
  }

  /** Apaga todos os dados locais. Pedidos antes de clientes e obras por causa das FKs. */
  async apagarTudo(): Promise<void> {
    await this.db.delete(pedidos);
    await this.db.delete(filaSync);
    await this.db.delete(clientes);
    await this.db.delete(obras);
    await this.db.delete(eventos);
    await this.db.delete(fotos);
    await this.db.delete(syncMeta);
  }
}
