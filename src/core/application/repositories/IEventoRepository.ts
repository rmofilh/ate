import type { Evento } from '../../domain/entities/Evento';

export interface IEventoRepository {
  save(evento: Evento): Promise<void>;
  findById(id: string): Promise<Evento | null>;
  findByUsuario(usuarioId: string): Promise<Evento[]>;
}
