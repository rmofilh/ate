import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

const PASTA_MIGRATIONS = path.resolve(__dirname, '../../../../../drizzle');

function abrirBanco() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: PASTA_MIGRATIONS });
  return { sqlite, db };
}

function nomes(sqlite: Database.Database, tipo: 'table' | 'index'): string[] {
  return (
    sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%'`)
      .all(tipo) as { name: string }[]
  ).map((linha) => linha.name);
}

describe('migrations SQLite', () => {
  it('cria as 7 tabelas do app', () => {
    const { sqlite } = abrirBanco();
    expect(nomes(sqlite, 'table')).toEqual(
      expect.arrayContaining([
        'clientes',
        'obras',
        'pedidos',
        'eventos',
        'fila_sync',
        'fotos',
        'sync_meta',
      ]),
    );
  });

  it('cria os índices, inclusive o único parcial do cliente balcão', () => {
    const { sqlite } = abrirBanco();
    expect(nomes(sqlite, 'index')).toEqual(
      expect.arrayContaining([
        'idx_clientes_usuario',
        'idx_cliente_balcao_unico',
        'idx_obras_usuario',
        'idx_pedidos_usuario_status',
        'idx_pedidos_cliente',
        'idx_pedidos_obra',
        'idx_eventos_usuario',
        'idx_fila_sync_status',
      ]),
    );
    const balcao = sqlite
      .prepare(`SELECT sql FROM sqlite_master WHERE name = 'idx_cliente_balcao_unico'`)
      .get() as { sql: string };
    expect(balcao.sql).toMatch(/UNIQUE/i);
    expect(balcao.sql).toMatch(/WHERE/i);
  });

  it('aplicar as migrations duas vezes não falha', () => {
    const { db } = abrirBanco();
    expect(() => migrate(db, { migrationsFolder: PASTA_MIGRATIONS })).not.toThrow();
  });

  it('CHECK barra status_sync fora do enum', () => {
    const { sqlite } = abrirBanco();
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO clientes (id, usuario_id, nome, contato, status_sync, criado_em_local)
           VALUES ('c1', 'u1', 'Ana', '1', 'QUALQUER', '2026-10-27T12:00:00.000Z')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('CHECK barra latitude fora do intervalo', () => {
    const { sqlite } = abrirBanco();
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO eventos (id, usuario_id, nome, data, endereco, latitude, longitude,
             status_sync, criado_em_local)
           VALUES ('e1', 'u1', 'Feira', '2026-10-27T12:00:00.000Z', 'Praça', 91, 0,
             'PENDENTE', '2026-10-27T12:00:00.000Z')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('índice parcial impede segundo cliente balcão vivo do mesmo usuário', () => {
    const { sqlite } = abrirBanco();
    const inserir = sqlite.prepare(
      `INSERT INTO clientes (id, usuario_id, nome, contato, status_sync, criado_em_local)
       VALUES (?, 'u1', 'Cliente Avulso', '', 'PENDENTE', '2026-10-27T12:00:00.000Z')`,
    );
    inserir.run('c1');
    expect(() => inserir.run('c2')).toThrow(/UNIQUE/);
  });
});
