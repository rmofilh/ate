import type { IObraRepository } from '../../../core/application/repositories/IObraRepository';
import type { Obra } from '../../../core/domain/entities/Obra';

export class InMemoryObraRepository implements IObraRepository {
  private readonly store = new Map<string, Obra>();

  async save(obra: Obra): Promise<void> {
    this.store.set(obra.id, obra);
  }

  async findById(id: string): Promise<Obra | null> {
    const obra = this.store.get(id) ?? null;
    return obra && obra.deletedAt === null ? obra : null;
  }

  async findByUsuario(usuarioId: string): Promise<Obra[]> {
    return [...this.store.values()].filter(
      (obra) => obra.usuarioId === usuarioId && obra.deletedAt === null,
    );
  }
}
