import type { IClienteRepository } from '../../../core/application/repositories/IClienteRepository';
import type { Cliente } from '../../../core/domain/entities/Cliente';

export class InMemoryClienteRepository implements IClienteRepository {
  private readonly store = new Map<string, Cliente>();

  private isBalcao(cliente: Cliente, usuarioId: string): boolean {
    return (
      cliente.usuarioId === usuarioId &&
      cliente.nome === 'Cliente Avulso' &&
      cliente.contato === '' &&
      cliente.deletedAt === null
    );
  }

  async save(cliente: Cliente): Promise<void> {
    this.store.set(cliente.id, cliente);
  }

  async findById(id: string): Promise<Cliente | null> {
    const cliente = this.store.get(id) ?? null;
    return cliente && cliente.deletedAt === null ? cliente : null;
  }

  async findByUsuario(usuarioId: string): Promise<Cliente[]> {
    return [...this.store.values()].filter(
      (cliente) => cliente.usuarioId === usuarioId && cliente.deletedAt === null,
    );
  }

  async findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null> {
    return [...this.store.values()].find((cliente) => this.isBalcao(cliente, usuarioId)) ?? null;
  }

  async saveBalcaoIfAbsent(
    cliente: Cliente,
  ): Promise<{ cliente: Cliente; created: boolean }> {
    const existente =
      [...this.store.values()].find((item) => this.isBalcao(item, cliente.usuarioId)) ?? null;
    if (existente) return { cliente: existente, created: false };

    this.store.set(cliente.id, cliente);
    return { cliente, created: true };
  }
}
