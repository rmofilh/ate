import type { Pedido } from '../../domain/entities/Pedido';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class ConcluirPedidoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { pedidoId: string; fotoPath: string | null }): Promise<Pedido> {
    const pedido = await this.pedidos.findById(args.pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');

    const obra = pedido.obraId ? await this.obras.findById(pedido.obraId) : null;
    if (pedido.obraId && (!obra || obra.usuarioId !== pedido.usuarioId)) {
      throw new Error('Obra nao encontrada');
    }

    pedido.concluir(args.fotoPath);
    if (obra?.tipo === 'UNICA') {
      obra.darBaixa();
      await this.obras.save(obra);
      await this.sync.enqueue(
        'EDITAR',
        'Obra',
        obra.id,
        JSON.stringify({ statusObra: obra.statusObra }),
      );
    }

    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'EDITAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ status: pedido.status }),
    );
    return pedido;
  }
}
