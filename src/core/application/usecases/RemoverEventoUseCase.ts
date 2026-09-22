import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { IEventoRepository } from '../repositories/IEventoRepository';

export class RemoverEventoUseCase {
  constructor(
    private readonly eventos: IEventoRepository,
    private readonly sync: ISyncGateway,
  ) {}

  async execute(args: { eventoId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) throw new Error('Remocao nao confirmada');

    const evento = await this.eventos.findById(args.eventoId);
    if (!evento) throw new Error('Evento nao encontrado');

    evento.cancelar();
    await this.eventos.save(evento);
    await this.sync.enqueue('DELETAR', 'Evento', evento.id, JSON.stringify({}));
  }
}
