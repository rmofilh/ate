import { Obra } from '../../domain/entities/Obra';
import type { TipoObra } from '../../domain/enums/TipoObra';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IObraRepository } from '../repositories/IObraRepository';

export class CadastrarObraUseCase {
  constructor(
    private readonly obras: IObraRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    usuarioId: string;
    nome: string;
    tipo: TipoObra;
    quantidade?: number;
    fotoPath?: string | null;
  }): Promise<Obra> {
    const obra = Obra.criar(args);
    await this.obras.save(obra);
    await this.sync.enqueue('CRIAR', 'Obra', obra.id, JSON.stringify({ nome: obra.nome }));
    return obra;
  }
}
