import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { schema } from './schema';

/** Tipo comum aos drivers expo-sqlite (app) e better-sqlite3 (testes). */
export type DrizzleAppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
