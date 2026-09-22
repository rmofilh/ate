import { Pedido } from '../../domain/entities/Pedido';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import { ResolverClienteBalcaoUseCase } from './ResolverClienteBalcaoUseCase';

export class VendaDiretaUseCase {
  constructor(
    private readonly obras: IObraRepository,
    private readonly pedidos: IPedidoRepository,
    private readonly clientes: IClienteRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    usuarioId: string;
    obraId: string;
    qtd: number;
    descricao?: string;
  }): Promise<Pedido> {
    if (!Number.isInteger(args.qtd) || args.qtd <= 0) {
      throw new Error('Quantidade deve ser inteiro > 0');
    }

    const obra = await this.obras.findById(args.obraId);
    if (!obra || obra.usuarioId !== args.usuarioId) throw new Error('Obra nao encontrada');
    if (obra.tipo !== 'SERIE') throw new Error('Venda direta somente para obra SERIE');
    if (args.qtd > obra.quantidade) throw new Error('Estoque insuficiente para venda direta');

    const resolverBalcao = new ResolverClienteBalcaoUseCase(this.clientes, this.sync);
    const cliente = await resolverBalcao.execute({ usuarioId: args.usuarioId });

    obra.removerUnidades(args.qtd);
    await this.obras.save(obra);
    await this.sync.enqueue(
      'EDITAR',
      'Obra',
      obra.id,
      JSON.stringify({ quantidade: obra.quantidade }),
    );

    const pedido = Pedido.criarVendaDireta({
      usuarioId: args.usuarioId,
      clienteId: cliente.id,
      obraId: obra.id,
      quantidade: args.qtd,
      descricao: args.descricao?.trim() || `Venda direta - ${obra.nome}`,
      canalOrigem: 'PRESENCIAL',
    });
    await this.pedidos.save(pedido);
    await this.sync.enqueue(
      'CRIAR',
      'Pedido',
      pedido.id,
      JSON.stringify({ vendaDireta: true }),
    );
    return pedido;
  }
}
