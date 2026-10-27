import { eq, sql } from 'drizzle-orm';

import { Obra, type ObraProps } from '../../../../core/domain/entities/Obra';
import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import { gerarIdTeste } from '../../../../test-support/ids';
import type { DrizzleAppDb } from '../DrizzleDb';
import { obras } from '../schema';
import { SQLiteObraRepository } from '../SQLiteObraRepository';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO = 'b1111111-1111-4111-8111-111111111111';

function props(o: Obra): ObraProps {
  return {
    id: o.id,
    usuarioId: o.usuarioId,
    nome: o.nome,
    tipo: o.tipo,
    quantidade: o.quantidade,
    statusObra: o.statusObra,
    fotoPath: o.fotoPath,
    statusSync: o.statusSync,
    criadoEmLocal: o.criadoEmLocal,
    deletedAt: o.deletedAt,
  };
}

function obraCom(override: Partial<ObraProps> = {}): Obra {
  return Obra.reidratar({
    id: gerarIdTeste(),
    usuarioId: USUARIO,
    nome: 'Coruja',
    tipo: 'SERIE',
    quantidade: 4,
    statusObra: 'DISPONIVEL',
    fotoPath: null,
    statusSync: 'PENDENTE',
    criadoEmLocal: new Date('2026-10-01T10:11:12.345Z'),
    deletedAt: null,
    ...override,
  });
}

describe('SQLiteObraRepository', () => {
  let db: DrizzleAppDb;
  let repo: SQLiteObraRepository;

  beforeEach(() => {
    db = bancoDeTeste();
    repo = new SQLiteObraRepository(db);
  });

  it.each<Partial<ObraProps>>([
    { tipo: 'UNICA', quantidade: 1, statusObra: 'DISPONIVEL' },
    { tipo: 'UNICA', quantidade: 1, statusObra: 'RESERVADA', fotoPath: 'fotos/aguia.jpg' },
    { tipo: 'UNICA', quantidade: 1, statusObra: 'ENTREGUE', statusSync: 'SINCRONIZADO' },
    { tipo: 'SERIE', quantidade: 0, statusObra: 'DISPONIVEL', statusSync: 'ERRO' },
    { tipo: 'SERIE', quantidade: 12, statusObra: 'ARQUIVADA', fotoPath: 'fotos/x.jpg' },
  ])('roundtrip campo a campo %o', async (override) => {
    const obra = obraCom(override);
    await repo.save(obra);

    const lida = await repo.findById(obra.id);
    expect(lida).toBeInstanceOf(Obra);
    expect(props(lida!)).toEqual(props(obra));
  });

  it('update por upsert altera campos e preserva updated_at', async () => {
    const obra = obraCom();
    await repo.save(obra);
    await db.run(sql`UPDATE obras SET updated_at = '2026-10-02T00:00:00.000Z' WHERE id = ${obra.id}`);

    obra.adicionarUnidades(3);
    obra.editar('Coruja Grande');
    await repo.save(obra);

    const [linha] = await db.select().from(obras).where(eq(obras.id, obra.id));
    expect(linha.quantidade).toBe(7);
    expect(linha.nome).toBe('Coruja Grande');
    expect(linha.updatedAt).toBe('2026-10-02T00:00:00.000Z');
  });

  it('tombstone some das leituras e continua no banco', async () => {
    const obra = obraCom();
    await repo.save(obra);
    obra.arquivar();
    obra.marcarRemovido();
    await repo.save(obra);

    expect(await repo.findById(obra.id)).toBeNull();
    expect(await repo.findByUsuario(USUARIO)).toEqual([]);
    const [linha] = await db.select().from(obras).where(eq(obras.id, obra.id));
    expect(linha.deletedAt).toBe(obra.deletedAt!.toISOString());
    expect(linha.statusObra).toBe('ARQUIVADA');
  });

  it('findByUsuario isola por usuário', async () => {
    const minha = obraCom();
    await repo.save(minha);
    await repo.save(obraCom({ usuarioId: OUTRO_USUARIO }));

    const lidas = await repo.findByUsuario(USUARIO);
    expect(lidas.map((o) => o.id)).toEqual([minha.id]);
  });
});
