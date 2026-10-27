import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { schema } from '../../infrastructure/database/sqlite/schema';

/** Conexão única do app com o banco local `ate.db`. */
export function openAppDatabase() {
  // enableChangeListener: base para a UI reagir às escritas do sync (Plano 4)
  const sqlite = openDatabaseSync('ate.db', { enableChangeListener: true });
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
