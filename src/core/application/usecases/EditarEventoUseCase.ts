import type { Evento } from '../../domain/entities/Evento';
import type { Coordenada } from '../../domain/value-objects/Coordenada';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IEventoRepository } from '../repositories/IEventoRepository';

export class EditarEventoUseCase {
  constructor(
    private readonly eventos: IEventoRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: {
    eventoId: string;
    nome: string;
    data: Date;
    endereco: string;
    localizacao: Coordenada;
    observacoes: string;
  }): Promise<Evento> {
    const evento = await this.eventos.findById(args.eventoId);
    if (!evento) throw new Error('Evento nao encontrado');

    evento.editar(
      args.nome,
      args.data,
      args.endereco,
      args.localizacao,
      args.observacoes,
    );
    await this.eventos.save(evento);
    await this.sync.enqueue(
      'EDITAR',
      'Evento',
      evento.id,
      JSON.stringify({ nome: evento.nome }),
    );
    return evento;
  }
}
