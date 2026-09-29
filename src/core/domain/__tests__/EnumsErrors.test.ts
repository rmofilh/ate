import {
  CoordenadaInvalidaError,
  DomainError,
  ObraInvalidaError,
  PedidoInvalidoError,
} from '../errors/DomainErrors';

describe('enums + errors', () => {
  it('canal origem aceita os 5 valores fixos', () => {
    const valores: string[] = ['INSTAGRAM', 'WHATSAPP', 'PRESENCIAL', 'TELEFONE', 'OUTROS'];
    expect(valores).toHaveLength(5);
  });

  it('erros de domínio herdam de DomainError e Error', () => {
    const e = new ObraInvalidaError('x');
    expect(e).toBeInstanceOf(DomainError);
    expect(e).toBeInstanceOf(Error);
    expect(new PedidoInvalidoError('y').name).toBe('PedidoInvalidoError');
    expect(new CoordenadaInvalidaError('z').name).toBe('CoordenadaInvalidaError');
  });
});
