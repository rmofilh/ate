import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/database/sqlite/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
