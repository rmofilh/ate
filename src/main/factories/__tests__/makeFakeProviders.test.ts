import { makeFakeProviders } from '../makeFakeProviders';

it('injeta o mesmo gerador na fixture e no cadastro posterior', async () => {
  const app = makeFakeProviders();
  const idsExistentes = new Set([
    ...app.clientes, ...app.obras, ...app.pedidos, ...app.eventos,
  ].map((entidade) => entidade.id));
  const novo = await app.useCases.cadastrarCliente.execute({ usuarioId: app.usuarioId,
    nome: 'Maria', contato: 'WhatsApp' });
  expect(idsExistentes.has(novo.id)).toBe(false);
  expect((await app.repositories.clientes.findById(novo.id))?.id).toBe(novo.id);
  expect(app.gateways.sync.queue.at(-1)?.entidadeId).toBe(novo.id);
});
