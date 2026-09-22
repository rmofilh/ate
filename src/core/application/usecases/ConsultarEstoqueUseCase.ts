import type { Obra } from '../../domain/entities/Obra';
import type { IObraRepository } from '../repositories/IObraRepository';

export class ConsultarEstoqueUseCase {
  constructor(private readonly obras: IObraRepository) {}

  async execute(args: { usuarioId: string }): Promise<Obra[]> {
    return this.obras.findByUsuario(args.usuarioId);
  }
}
