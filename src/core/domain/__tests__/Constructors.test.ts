import { Cliente, type ClienteProps } from '../entities/Cliente';
import { Evento, type EventoProps } from '../entities/Evento';
import { Obra, type ObraProps } from '../entities/Obra';
import { Pedido, type PedidoProps } from '../entities/Pedido';

function construirEntidadesDiretamente(): void {
  // @ts-expect-error Entidades devem ser criadas por suas factories.
  new Cliente({} as ClienteProps);
  // @ts-expect-error Entidades devem ser criadas por suas factories.
  new Obra({} as ObraProps);
  // @ts-expect-error Entidades devem ser criadas por suas factories.
  new Pedido({} as PedidoProps);
  // @ts-expect-error Entidades devem ser criadas por suas factories.
  new Evento({} as EventoProps);
}

describe('construtores das entidades', () => {
  it('são restritos às factories no contrato TypeScript', () => {
    expect(construirEntidadesDiretamente).toBeInstanceOf(Function);
  });
});
