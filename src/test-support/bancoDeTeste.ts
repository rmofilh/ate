import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import type { DrizzleAppDb } from '../infrastructure/database/sqlite/DrizzleDb';
import { schema } from '../infrastructure/database/sqlite/schema';

/** SQLite real em memória com as mesmas migrations do app. */
export function bancoDeTeste(): DrizzleAppDb {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON'); // explícito, igual ao app
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  return db;
}
