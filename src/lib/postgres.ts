import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing SUPABASE_DB_URL. Set it to the Postgres connection string from Supabase.');
}

const isProduction = process.env.NODE_ENV === 'production';

const globalForSql = globalThis as unknown as {
  cozySqlClient?: ReturnType<typeof postgres>;
};

export const sql =
  globalForSql.cozySqlClient ??
  postgres(databaseUrl, {
    ssl: isProduction
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
    max_lifetime: 60 * 30,
    max: 10,
    idle_timeout: 60,
  });

if (!isProduction) {
  globalForSql.cozySqlClient = sql;
}

export type SqlClient = typeof sql;
