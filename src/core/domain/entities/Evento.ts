import { STATUS_SYNC, type StatusSync } from '../enums/StatusSync';
import { EventoInvalidoError } from '../errors/DomainErrors';
import {
  copiarData,
  copiarDataOuNula,
  isDataValida,
  isDataValidaOuNula,
  pertenceA,
} from '../validation/estrutura';
import { isUuidV4 } from '../validation/uuid';
import { Coordenada } from '../value-objects/Coordenada';

export interface EventoProps {
  id: string;
  usuarioId: string;
  nome: string;
  data: Date;
  endereco: string;
  localizacao: Coordenada;
  observacoes: string;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

export class Evento {
  private _props: EventoProps;

  private constructor(props: EventoProps) {
    this._props = { ...props, data: new Date(props.data.getTime()) };
  }

  static criar(args: {
    id: string;
    usuarioId: string;
    nome: string;
    data: Date;
    endereco: string;
    localizacao: Coordenada;
    observacoes?: string;
  }): Evento {
    const nome = args.nome.trim();
    const endereco = args.endereco.trim();
    if (!nome) throw new EventoInvalidoError('Nome do evento é obrigatório');
    if (!endereco) throw new EventoInvalidoError('Endereço do evento é obrigatório');
    if (!isUuidV4(args.usuarioId)) throw new EventoInvalidoError('usuarioId deve ser UUID v4');
    if (!(args.data instanceof Date) || Number.isNaN(args.data.getTime())) {
      throw new EventoInvalidoError('Data do evento inválida');
    }
    if (!(args.localizacao instanceof Coordenada)) {
      throw new EventoInvalidoError('Localização inválida');
    }

    if (!isUuidV4(args.id)) throw new EventoInvalidoError('id deve ser UUID v4');
    return new Evento({
      id: args.id,
      usuarioId: args.usuarioId,
      nome,
      data: args.data,
      endereco,
      localizacao: args.localizacao,
      observacoes: args.observacoes ?? '',
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  /** Reconstrói um evento persistido. Valida só a estrutura, sem regras de criação. */
  static reidratar(props: EventoProps): Evento {
    Evento.validarEstrutura(props);
    return new Evento({
      ...props,
      localizacao: new Coordenada(props.localizacao.latitude, props.localizacao.longitude),
      criadoEmLocal: copiarData(props.criadoEmLocal),
      deletedAt: copiarDataOuNula(props.deletedAt),
    });
  }

  private static validarEstrutura(props: EventoProps): void {
    if (!isUuidV4(props.id)) throw new EventoInvalidoError('id deve ser UUID v4');
    if (!isUuidV4(props.usuarioId)) throw new EventoInvalidoError('usuarioId deve ser UUID v4');
    if (
      typeof props.nome !== 'string' ||
      typeof props.endereco !== 'string' ||
      typeof props.observacoes !== 'string'
    ) {
      throw new EventoInvalidoError('nome, endereco e observacoes devem ser texto');
    }
    if (!isDataValida(props.data)) throw new EventoInvalidoError('Data do evento inválida');
    if (!(props.localizacao instanceof Coordenada)) {
      throw new EventoInvalidoError('Localização inválida');
    }
    if (!pertenceA(props.statusSync, STATUS_SYNC)) {
      throw new EventoInvalidoError('statusSync inválido');
    }
    if (!isDataValida(props.criadoEmLocal)) {
      throw new EventoInvalidoError('criadoEmLocal inválida');
    }
    if (!isDataValidaOuNula(props.deletedAt)) throw new EventoInvalidoError('deletedAt inválida');
  }

  get id(): string {
    return this._props.id;
  }

  get usuarioId(): string {
    return this._props.usuarioId;
  }

  get nome(): string {
    return this._props.nome;
  }

  get data(): Date {
    return new Date(this._props.data.getTime());
  }

  get endereco(): string {
    return this._props.endereco;
  }

  get localizacao(): Coordenada {
    return this._props.localizacao;
  }

  get observacoes(): string {
    return this._props.observacoes;
  }

  get statusSync(): StatusSync {
    return this._props.statusSync;
  }

  get criadoEmLocal(): Date {
    return this._props.criadoEmLocal;
  }

  get deletedAt(): Date | null {
    return this._props.deletedAt;
  }

  editar(
    nome: string,
    data: Date,
    endereco: string,
    localizacao: Coordenada,
    observacoes: string,
  ): void {
    if (this._props.deletedAt !== null) {
      throw new EventoInvalidoError('Evento removido não pode ser editado');
    }
    const n = nome.trim();
    const e = endereco.trim();
    if (!n) throw new EventoInvalidoError('Nome do evento é obrigatório');
    if (!e) throw new EventoInvalidoError('Endereço do evento é obrigatório');
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
      throw new EventoInvalidoError('Data do evento inválida');
    }
    if (!(localizacao instanceof Coordenada)) {
      throw new EventoInvalidoError('Localização inválida');
    }
    this._props.nome = n;
    this._props.data = new Date(data.getTime());
    this._props.endereco = e;
    this._props.localizacao = localizacao;
    this._props.observacoes = observacoes;
    this._props.statusSync = 'PENDENTE';
  }

  cancelar(): void {
    if (this._props.deletedAt !== null) return;
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }
}
