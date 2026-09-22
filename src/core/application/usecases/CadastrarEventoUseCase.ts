import { Evento } from '../../domain/entities/Evento';
import type { Coordenada } from '../../domain/value-objects/Coordenada';
import type { ILocationGateway } from '../gateways/ILocationGateway';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IEventoRepository } from '../repositories/IEventoRepository';

export class CadastrarEventoUseCase {
  constructor(
    private readonly eventos: IEventoRepository,
    private readonly sync: ISyncGateway,
    private readonly gps: ILocationGateway,
  ) {}

  async execute(args: {
    usuarioId: string;
    nome: string;
    data: Date;
    endereco: string;
    localizacao?: Coordenada;
    usarGps?: boolean;
    observacoes?: string;
  }): Promise<Evento> {
    let ponto = args.localizacao;
    if (args.usarGps) ponto = await this.gps.getCurrent();
    if (!ponto) {
      throw new Error('Localizacao do evento e obrigatoria (use GPS ou posicione o pin)');
    }

    const evento = Evento.criar({
      usuarioId: args.usuarioId,
      nome: args.nome,
      data: args.data,
      endereco: args.endereco,
      localizacao: ponto,
      observacoes: args.observacoes,
    });
    await this.eventos.save(evento);
    await this.sync.enqueue('CRIAR', 'Evento', evento.id, JSON.stringify({ nome: evento.nome }));
    return evento;
  }
}
