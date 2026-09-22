import type { Obra } from '../../domain/entities/Obra';

export interface IObraRepository {
  save(obra: Obra): Promise<void>;
  findById(id: string): Promise<Obra | null>;
  findByUsuario(usuarioId: string): Promise<Obra[]>;
}
