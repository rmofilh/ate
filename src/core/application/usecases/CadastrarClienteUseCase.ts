import { Cliente } from '../../domain/entities/Cliente';
import type { IIdGenerator } from '../gateways/IIdGenerator';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IClienteRepository } from '../repositories/IClienteRepository';

export class CadastrarClienteUseCase {
  constructor(
    private readonly repo: IClienteRepository,
    private readonly sync: ISyncGateway,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(args: { usuarioId: string; nome: string; contato: string }): Promise<Cliente> {
    const cliente = Cliente.criar({ ...args, id: this.ids.gerar() });
    await this.repo.save(cliente);
    await this.sync.enqueue(
      'CRIAR',
      'Cliente',
      cliente.id,
      JSON.stringify({ nome: cliente.nome }),
    );
    return cliente;
  }
}
