import type { Obra } from '../../domain/entities/Obra';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';

export class AdicionarUnidadesUseCase {
  constructor(
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { obraId: string; qtd: number }): Promise<Obra> {
    const obra = await this.obras.findById(args.obraId);
    if (!obra) throw new Error('Obra nao encontrada');

    obra.adicionarUnidades(args.qtd);
    await this.obras.save(obra);
    await this.sync.enqueue(
      'EDITAR',
      'Obra',
      obra.id,
      JSON.stringify({ quantidade: obra.quantidade }),
    );
    return obra;
  }
}
