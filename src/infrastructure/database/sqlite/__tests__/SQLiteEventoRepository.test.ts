import { eq, sql } from 'drizzle-orm';

import { Evento, type EventoProps } from '../../../../core/domain/entities/Evento';
import { Coordenada } from '../../../../core/domain/value-objects/Coordenada';
import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import { gerarIdTeste } from '../../../../test-support/ids';
import type { DrizzleAppDb } from '../DrizzleDb';
import { eventos } from '../schema';
import { SQLiteEventoRepository } from '../SQLiteEventoRepository';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const OUTRO_USUARIO = 'b1111111-1111-4111-8111-111111111111';

function props(e: Evento): EventoProps {
  return {
    id: e.id,
    usuarioId: e.usuarioId,
    nome: e.nome,
    data: e.data,
    endereco: e.endereco,
    localizacao: e.localizacao,
    observacoes: e.observacoes,
    statusSync: e.statusSync,
    criadoEmLocal: e.criadoEmLocal,
    deletedAt: e.deletedAt,
  };
}

function eventoCom(override: Partial<EventoProps> = {}): Evento {
  return Evento.reidratar({
    id: gerarIdTeste(),
    usuarioId: USUARIO,
    nome: 'Feira da Praça',
    data: new Date('2026-10-12T12:00:00.000Z'),
    endereco: 'Praça Central, banca 5',
    localizacao: new Coordenada(-23.5505, -46.6333),
    observacoes: '',
    statusSync: 'PENDENTE',
    criadoEmLocal: new Date('2026-10-01T10:11:12.345Z'),
    deletedAt: null,
    ...override,
  });
}

describe('SQLiteEventoRepository', () => {
  let db: DrizzleAppDb;
  let repo: SQLiteEventoRepository;

  beforeEach(() => {
    db = bancoDeTeste();
    repo = new SQLiteEventoRepository(db);
  });

  it.each<Partial<EventoProps>>([
    {},
    { observacoes: 'Levar corujas', statusSync: 'SINCRONIZADO' },
    { localizacao: new Coordenada(-90, 180), statusSync: 'ERRO' },
    { localizacao: new Coordenada(0, 0) },
  ])('roundtrip campo a campo %#', async (override) => {
    const evento = eventoCom(override);
    await repo.save(evento);

    const lido = await repo.findById(evento.id);
    expect(lido).toBeInstanceOf(Evento);
    expect(lido!.localizacao).toBeInstanceOf(Coordenada);
    expect(props(lido!)).toEqual(props(evento));
  });

  it('preserva casas decimais reais da coordenada', async () => {
    const evento = eventoCom({ localizacao: new Coordenada(-23.5505199, -46.6333094) });
    await repo.save(evento);

    const lido = await repo.findById(evento.id);
    expect(lido!.localizacao.latitude).toBe(-23.5505199);
    expect(lido!.localizacao.longitude).toBe(-46.6333094);
  });

  it('update por upsert altera campos e preserva updated_at', async () => {
    const evento = eventoCom();
    await repo.save(evento);
    await db.run(sql`UPDATE eventos SET updated_at = '2026-10-02T00:00:00.000Z' WHERE id = ${evento.id}`);

    evento.editar(
      'Feira Nova',
      new Date('2026-11-20T12:00:00.000Z'),
      'Rua B',
      new Coordenada(-22.9, -43.2),
      'obs',
    );
    await repo.save(evento);

    const [linha] = await db.select().from(eventos).where(eq(eventos.id, evento.id));
    expect(linha).toMatchObject({
      nome: 'Feira Nova',
      data: '2026-11-20T12:00:00.000Z',
      endereco: 'Rua B',
      latitude: -22.9,
      longitude: -43.2,
      observacoes: 'obs',
      updatedAt: '2026-10-02T00:00:00.000Z',
    });
  });

  it('tombstone some das leituras e continua no banco', async () => {
    const evento = eventoCom();
    await repo.save(evento);
    evento.cancelar();
    await repo.save(evento);

    expect(await repo.findById(evento.id)).toBeNull();
    expect(await repo.findByUsuario(USUARIO)).toEqual([]);
    const [linha] = await db.select().from(eventos).where(eq(eventos.id, evento.id));
    expect(linha.deletedAt).toBe(evento.deletedAt!.toISOString());
  });

  it('findByUsuario isola por usuário', async () => {
    const meu = eventoCom();
    await repo.save(meu);
    await repo.save(eventoCom({ usuarioId: OUTRO_USUARIO }));

    expect((await repo.findByUsuario(USUARIO)).map((e) => e.id)).toEqual([meu.id]);
  });
});
