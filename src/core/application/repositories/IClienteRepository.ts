import type { Cliente } from '../../domain/entities/Cliente';

export interface IClienteRepository {
  save(cliente: Cliente): Promise<void>;
  findById(id: string): Promise<Cliente | null>;
  findByUsuario(usuarioId: string): Promise<Cliente[]>;
  findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null>;
  saveBalcaoIfAbsent(cliente: Cliente): Promise<{ cliente: Cliente; created: boolean }>;
}
