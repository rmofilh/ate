import { Pedido } from '../../domain/entities/Pedido';
import type { CanalOrigem } from '../../domain/enums/CanalOrigem';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class CadastrarPedidoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly obras: IObraRepository,
    private readonly clientes: IClienteRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    usuarioId: string;
    clienteId: string;
    descricao: string;
    canalOrigem: CanalOrigem;
    dataEntrega: Date;
    obraId?: string | null;
  }): Promise<Pedido> {
    const cliente = await this.clientes.findById(args.clienteId);
    if (!cliente || cliente.usuarioId !== args.usuarioId) {
      throw new Error('Cliente nao encontrado');
    }

    const pedido = Pedido.criar({
      usuarioId: args.usuarioId,
      clienteId: args.clienteId,
      descricao: args.descricao,
      canalOrigem: args.canalOrigem,
      dataEntrega: args.dataEntrega,
    });

    if (args.obraId) {
      const obra = await this.obras.findById(args.obraId);
      if (!obra || obra.usuarioId !== args.usuarioId) throw new Error('Obra nao encontrada');

      if (obra.tipo === 'UNICA') obra.reservar();
      else obra.decrementarUnidades();
      pedido.vincularObra(obra.id);

      await this.obras.save(obra);
      await this.sync.enqueue(
        'EDITAR',
        'Obra',
        obra.id,
        JSON.stringify({ statusObra: obra.statusObra, quantidade: obra.quantidade }),
      );
    }

    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'CRIAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ descricao: pedido.descricao }),
    );
    return pedido;
  }
}
