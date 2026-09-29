import type { Pedido } from '../../domain/entities/Pedido';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class VincularObraAoPedidoUseCase {
  constructor(
    private readonly pedidos: IPedidoRepository,
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { pedidoId: string; obraId: string }): Promise<Pedido> {
    const pedido = await this.pedidos.findById(args.pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');

    const obra = await this.obras.findById(args.obraId);
    if (!obra || obra.usuarioId !== pedido.usuarioId) throw new Error('Obra nao encontrada');

    if (pedido.status !== 'A_FAZER' || pedido.obraId !== null) {
      throw new Error('Pedido nao esta disponivel para vinculo');
    }
    if (obra.statusObra === 'ARQUIVADA') throw new Error('Obra nao encontrada');
    if (obra.tipo === 'UNICA' && obra.statusObra !== 'DISPONIVEL') {
      throw new Error('Obra UNICA nao esta disponivel');
    }
    if (obra.tipo === 'SERIE' && obra.quantidade <= 0) {
      throw new Error('Sem estoque para baixa');
    }

    pedido.vincularObra(obra.id);
    if (obra.tipo === 'UNICA') obra.reservar();
    else obra.decrementarUnidades();

    await this.obras.save(obra);
    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'EDITAR',
      'Obra',
      obra.id,
      JSON.stringify({ statusObra: obra.statusObra, quantidade: obra.quantidade }),
    );
    await this.sync.enqueue(
      'EDITAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ obraId: pedido.obraId }),
    );
    return pedido;
  }
}
