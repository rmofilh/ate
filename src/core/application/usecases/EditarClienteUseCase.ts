import type { Cliente } from '../../domain/entities/Cliente';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IClienteRepository } from '../repositories/IClienteRepository';

export class EditarClienteUseCase {
  constructor(
    private readonly repo: IClienteRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { clienteId: string; nome: string; contato: string }): Promise<Cliente> {
    const cliente = await this.repo.findById(args.clienteId);
    if (!cliente) throw new Error('Cliente nao encontrado');
    if (cliente.nome === 'Cliente Avulso' && cliente.contato === '') {
      throw new Error('Cliente Avulso nao pode ser editado');
    }

    cliente.editar(args.nome, args.contato);
    await this.repo.save(cliente);
    await this.sync.enqueue(
      'EDITAR',
      'Cliente',
      cliente.id,
      JSON.stringify({ nome: cliente.nome }),
    );
    return cliente;
  }
}
