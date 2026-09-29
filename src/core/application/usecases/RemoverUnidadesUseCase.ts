import type { Obra } from '../../domain/entities/Obra';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';

export class RemoverUnidadesUseCase {
  constructor(
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    obraId: string;
    qtd: number;
    confirmado: boolean;
    duplaConfirmacao: boolean;
  }): Promise<Obra> {
    if (!args.confirmado) throw new Error('Remocao nao confirmada');
    if (!args.duplaConfirmacao) {
      throw new Error('Dupla confirmacao obrigatoria para baixa manual');
    }

    const obra = await this.obras.findById(args.obraId);
    if (!obra) throw new Error('Obra nao encontrada');

    obra.removerUnidades(args.qtd);
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
