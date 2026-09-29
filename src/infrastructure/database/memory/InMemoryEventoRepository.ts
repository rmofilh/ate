import type { IEventoRepository } from '../../../core/application/repositories/IEventoRepository';
import type { Evento } from '../../../core/domain/entities/Evento';

export class InMemoryEventoRepository implements IEventoRepository {
  private readonly store = new Map<string, Evento>();

  async save(evento: Evento): Promise<void> {
    this.store.set(evento.id, evento);
  }

  async findById(id: string): Promise<Evento | null> {
    const evento = this.store.get(id) ?? null;
    return evento && evento.deletedAt === null ? evento : null;
  }

  async findByUsuario(usuarioId: string): Promise<Evento[]> {
    return [...this.store.values()].filter(
      (evento) => evento.usuarioId === usuarioId && evento.deletedAt === null,
    );
  }
}
