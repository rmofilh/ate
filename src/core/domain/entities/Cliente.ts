import { STATUS_SYNC, type StatusSync } from '../enums/StatusSync';
import { ClienteInvalidoError } from '../errors/DomainErrors';
import {
  copiarData,
  copiarDataOuNula,
  isDataValida,
  isDataValidaOuNula,
  pertenceA,
} from '../validation/estrutura';
import { isUuidV4 } from '../validation/uuid';

export interface ClienteProps {
  id: string;
  usuarioId: string;
  nome: string;
  contato: string;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

export class Cliente {
  private _props: ClienteProps;

  private constructor(props: ClienteProps) {
    this._props = { ...props };
  }

  static criar(args: { id: string; usuarioId: string; nome: string; contato: string }): Cliente {
    const nome = args.nome.trim();
    const contato = args.contato.trim();
    if (!nome) throw new ClienteInvalidoError('Nome do cliente é obrigatório');
    if (!contato) throw new ClienteInvalidoError('Contato do cliente é obrigatório');
    if (!isUuidV4(args.usuarioId)) {
      throw new ClienteInvalidoError('usuarioId deve ser UUID v4');
    }
    if (!isUuidV4(args.id)) throw new ClienteInvalidoError('id deve ser UUID v4');
    return new Cliente({
      id: args.id,
      usuarioId: args.usuarioId,
      nome,
      contato,
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  static balcao(args: { id: string; usuarioId: string }): Cliente {
    if (!isUuidV4(args.usuarioId)) throw new ClienteInvalidoError('usuarioId deve ser UUID v4');
    if (!isUuidV4(args.id)) throw new ClienteInvalidoError('id deve ser UUID v4');
    return new Cliente({
      id: args.id,
      usuarioId: args.usuarioId,
      nome: 'Cliente Avulso',
      contato: '',
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  /** Reconstrói um cliente persistido. Valida só a estrutura, sem regras de criação. */
  static reidratar(props: ClienteProps): Cliente {
    Cliente.validarEstrutura(props);
    return new Cliente({
      ...props,
      criadoEmLocal: copiarData(props.criadoEmLocal),
      deletedAt: copiarDataOuNula(props.deletedAt),
    });
  }

  private static validarEstrutura(props: ClienteProps): void {
    if (!isUuidV4(props.id)) throw new ClienteInvalidoError('id deve ser UUID v4');
    if (!isUuidV4(props.usuarioId)) throw new ClienteInvalidoError('usuarioId deve ser UUID v4');
    if (typeof props.nome !== 'string' || typeof props.contato !== 'string') {
      throw new ClienteInvalidoError('nome e contato devem ser texto');
    }
    if (!pertenceA(props.statusSync, STATUS_SYNC)) {
      throw new ClienteInvalidoError('statusSync inválido');
    }
    if (!isDataValida(props.criadoEmLocal)) {
      throw new ClienteInvalidoError('criadoEmLocal inválida');
    }
    if (!isDataValidaOuNula(props.deletedAt)) throw new ClienteInvalidoError('deletedAt inválida');
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

  get contato(): string {
    return this._props.contato;
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

  editar(nome: string, contato: string): void {
    this.assertVivo();
    const n = nome.trim();
    const c = contato.trim();
    if (!n) throw new ClienteInvalidoError('Nome do cliente é obrigatório');
    if (!c) throw new ClienteInvalidoError('Contato do cliente é obrigatório');
    this._props.nome = n;
    this._props.contato = c;
    this._props.statusSync = 'PENDENTE';
  }

  marcarRemovido(): void {
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertVivo(): void {
    if (this._props.deletedAt !== null) {
      throw new ClienteInvalidoError('Cliente removido não pode ser editado');
    }
  }
}
