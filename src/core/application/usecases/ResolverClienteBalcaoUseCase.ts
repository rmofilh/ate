import { Cliente } from '../../domain/entities/Cliente';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IClienteRepository } from '../repositories/IClienteRepository';

export class ResolverClienteBalcaoUseCase {
  constructor(
    private readonly repo: IClienteRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { usuarioId: string }): Promise<Cliente> {
    const existente = await this.repo.findBalcaoByUsuario(args.usuarioId);
    if (existente) return existente;

    const candidato = Cliente.balcao(args.usuarioId);
    const { cliente, created } = await this.repo.saveBalcaoIfAbsent(candidato);
    if (created) {
      await this.sync.enqueue(
        'CRIAR',
        'Cliente',
        cliente.id,
        JSON.stringify({ nome: cliente.nome }),
      );
    }
    return cliente;
  }
}
