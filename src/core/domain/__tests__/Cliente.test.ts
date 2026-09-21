import { Cliente } from '../entities/Cliente';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';

describe('Cliente', () => {
  it('cria com PENDENTE e sem deletedAt', () => {
    const c = Cliente.criar({ usuarioId, nome: 'João da Silva', contato: '(11) 99999-9999' });
    expect(c.nome).toBe('João da Silva');
    expect(c.statusSync).toBe('PENDENTE');
    expect(c.deletedAt).toBeNull();
    expect(c.usuarioId).toBe(usuarioId);
  });

  it('rejeita nome vazio ou só-espaços (Review Focus)', () => {
    expect(() => Cliente.criar({ usuarioId, nome: '', contato: 'x' })).toThrow(/nome/i);
    expect(() => Cliente.criar({ usuarioId, nome: '   ', contato: 'x' })).toThrow(/nome/i);
  });

  it('rejeita contato vazio ou só-espaços na criação e edição', () => {
    expect(() => Cliente.criar({ usuarioId, nome: 'João', contato: '   ' })).toThrow(/contato/i);

    const c = Cliente.criar({ usuarioId, nome: 'João', contato: 'x' });
    expect(() => c.editar('João', '   ')).toThrow(/contato/i);
  });

  it('editar() troca nome/contato e volta para PENDENTE', () => {
    const c = Cliente.criar({ usuarioId, nome: 'João', contato: 'a' });
    c.editar('João Editado', '(11) 98888-8888');
    expect(c.nome).toBe('João Editado');
    expect(c.statusSync).toBe('PENDENTE');
  });

  it('balcao() cria Cliente Avulso único por usuario', () => {
    const b = Cliente.balcao(usuarioId);
    expect(b.nome).toBe('Cliente Avulso');
    expect(b.usuarioId).toBe(usuarioId);
  });

  it('marcarRemovido() preenche deletedAt (soft delete)', () => {
    const c = Cliente.criar({ usuarioId, nome: 'X', contato: 'y' });
    expect(c.deletedAt).toBeNull();
    c.marcarRemovido();
    expect(c.deletedAt).toBeInstanceOf(Date);
  });
});
