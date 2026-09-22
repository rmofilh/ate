import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class RemoverObraUseCase {
  constructor(
    private readonly obras: IObraRepository,
    private readonly pedidos: IPedidoRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { obraId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) throw new Error('Remocao nao confirmada');

    const obra = await this.obras.findById(args.obraId);
    if (!obra) throw new Error('Obra nao encontrada');

    const vinculados = (await this.pedidos.findByUsuario(obra.usuarioId)).filter(
      (pedido) =>
        pedido.obraId === obra.id && pedido.status !== 'FEITO' && pedido.deletedAt === null,
    );
    if (vinculados.length > 0) {
      throw new Error('Obra vinculada a pedido aberto nao pode ser removida');
    }

    obra.arquivar();
    obra.marcarRemovido();
    await this.obras.save(obra);
    await this.sync.enqueue('DELETAR', 'Obra', obra.id, JSON.stringify({}));
  }
}
