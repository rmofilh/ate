import { Obra } from '../entities/Obra';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';

describe('Obra criar', () => {
  it('UNICA nasce DISPONIVEL com quantidade 1', () => {
    const o = Obra.criar({ usuarioId, nome: 'Águia', tipo: 'UNICA' });
    expect(o.statusObra).toBe('DISPONIVEL');
    expect(o.quantidade).toBe(1);
  });

  it('SERIE exige quantidade > 0', () => {
    expect(() =>
      Obra.criar({ usuarioId, nome: 'Coruja', tipo: 'SERIE', quantidade: 0 }),
    ).toThrow(/quantidade/i);
    const o = Obra.criar({ usuarioId, nome: 'Coruja', tipo: 'SERIE', quantidade: 5 });
    expect(o.quantidade).toBe(5);
  });

  it('rejeita nome só-espaços e quantidade float/NaN (Review Focus)', () => {
    expect(() => Obra.criar({ usuarioId, nome: '   ', tipo: 'UNICA' })).toThrow(/nome/i);
    expect(() =>
      Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 1.5 }),
    ).toThrow();
    expect(() =>
      Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: NaN }),
    ).toThrow();
  });
});

describe('Obra UNICA', () => {
  it('reservar() só de DISPONIVEL; liberar() só de RESERVADA; darBaixa() vai a ENTREGUE', () => {
    const o = Obra.criar({ usuarioId, nome: 'A', tipo: 'UNICA' });
    o.reservar();
    expect(o.statusObra).toBe('RESERVADA');
    expect(() => o.reservar()).toThrow();
    o.liberar();
    expect(o.statusObra).toBe('DISPONIVEL');
    o.reservar();
    o.darBaixa();
    expect(o.statusObra).toBe('ENTREGUE');
  });

  it('reservar SERIE lança; decrementar UNICA lança', () => {
    const s = Obra.criar({ usuarioId, nome: 'S', tipo: 'SERIE', quantidade: 3 });
    expect(() => s.reservar()).toThrow();
    const u = Obra.criar({ usuarioId, nome: 'U', tipo: 'UNICA' });
    expect(() => u.decrementarUnidades()).toThrow();
  });
});

describe('Obra SERIE estoque', () => {
  it('decrementar/incrementar/adicionar operam quantidade', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 4 });
    o.decrementarUnidades();
    expect(o.quantidade).toBe(3);
    o.incrementarUnidades();
    expect(o.quantidade).toBe(4);
    o.adicionarUnidades(2);
    expect(o.quantidade).toBe(6);
    expect(() => o.adicionarUnidades(0)).toThrow();
  });

  it('RF25 válido: removerUnidades decrementa e mantém DISPONIVEL mesmo zerando', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 2 });
    o.removerUnidades(2);
    expect(o.quantidade).toBe(0);
    expect(o.statusObra).toBe('DISPONIVEL');
  });

  it('RF25 inválido: qtd<=0, qtd>atual ou tipo UNICA lança sem alterar', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 2 });
    expect(() => o.removerUnidades(0)).toThrow();
    expect(() => o.removerUnidades(3)).toThrow();
    expect(o.quantidade).toBe(2);
    const u = Obra.criar({ usuarioId, nome: 'U', tipo: 'UNICA' });
    expect(() => u.removerUnidades(1)).toThrow();
  });

  it('obra ARQUIVADA não pode ser alterada nem voltar a DISPONIVEL', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 2 });
    o.arquivar();

    expect(() => o.removerUnidades(1)).toThrow(/arquivada/i);
    expect(o.quantidade).toBe(2);
    expect(o.statusObra).toBe('ARQUIVADA');
  });
});
