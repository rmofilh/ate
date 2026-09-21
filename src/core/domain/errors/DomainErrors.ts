export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ObraInvalidaError extends DomainError {}
export class PedidoInvalidoError extends DomainError {}
export class ClienteInvalidoError extends DomainError {}
export class EventoInvalidoError extends DomainError {}
export class CoordenadaInvalidaError extends DomainError {}
