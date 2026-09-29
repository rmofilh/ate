import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class CancelarPedidoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { pedidoId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) return;

    const pedido = await this.pedidos.findById(args.pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');

    if (pedido.obraId) {
      const obra = await this.obras.findById(pedido.obraId);
      if (!obra || obra.usuarioId !== pedido.usuarioId) throw new Error('Obra nao encontrada');

      if (
        obra.tipo === 'UNICA' &&
        (obra.statusObra === 'RESERVADA' || obra.statusObra === 'ENTREGUE')
      ) {
        obra.restaurarAposCancelamento();
      }
      if (obra.tipo === 'SERIE') obra.adicionarUnidades(pedido.quantidadeObra);
      await this.obras.save(obra);
      await this.sync.enqueue(
        'EDITAR',
        'Obra',
        obra.id,
        JSON.stringify({ statusObra: obra.statusObra, quantidade: obra.quantidade }),
      );
    }

    pedido.cancelar();
    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'DELETAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ deletedAt: pedido.deletedAt }),
    );
  }
}
