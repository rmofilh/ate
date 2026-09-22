import type { Evento } from '../../domain/entities/Evento';
import type { IEventoRepository } from '../repositories/IEventoRepository';

export class ListarEventosUseCase {
  constructor(private readonly eventos: IEventoRepository) {}

  async execute(args: { usuarioId: string }): Promise<Evento[]> {
    return this.eventos.findByUsuario(args.usuarioId);
  }
}
