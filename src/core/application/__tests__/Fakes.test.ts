import { Cliente } from '../../domain/entities/Cliente';
import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { seedFixtures } from '../../../infrastructure/seed/fixtures';

const USUARIO_ID = 'a1111111-1111-4111-8111-111111111111';

describe('fakes + fixtures', () => {
  it('InMemory filtra soft-deleted', async () => {
    const repo = new InMemoryClienteRepository();
    const cliente = Cliente.criar({ usuarioId: USUARIO_ID, nome: 'Joao', contato: 'x' });
    await repo.save(cliente);
    expect(await repo.findByUsuario(USUARIO_ID)).toHaveLength(1);

    cliente.marcarRemovido();
    await repo.save(cliente);

    expect(await repo.findByUsuario(USUARIO_ID)).toHaveLength(0);
  });

  it('seed popula Kanban (3 colunas), Estoque e Mapa nao-vazios', () => {
    const seed = seedFixtures();
    expect(seed.pedidos.filter((pedido) => pedido.status === 'A_FAZER').length).toBeGreaterThanOrEqual(1);
    expect(seed.pedidos.filter((pedido) => pedido.status === 'FAZENDO').length).toBeGreaterThanOrEqual(1);
    expect(seed.pedidos.filter((pedido) => pedido.status === 'FEITO').length).toBeGreaterThanOrEqual(1);
    expect(seed.obras.length).toBeGreaterThanOrEqual(2);
    expect(seed.eventos.length).toBeGreaterThanOrEqual(1);
  });

  it('seed vincula venda direta ao Cliente Avulso', () => {
    const seed = seedFixtures();
    const balcao = seed.clientes.find(
      (cliente) => cliente.nome === 'Cliente Avulso' && cliente.contato === '',
    );
    const vendaDireta = seed.pedidos.find((pedido) => pedido.vendaDireta);

    expect(balcao).toBeDefined();
    expect(vendaDireta?.clienteId).toBe(balcao?.id);
  });
});
