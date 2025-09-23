# Postgres.js integration

We now expose a typed Postgres.js client in src/lib/postgres.ts so that server-side code can run SQL when the Supabase client is not enough.

## Environment

Add SUPABASE_DB_URL to your environment (for local development you can copy it from the Supabase dashboard → Project Settings → Database → Connection string → URI). The value looks like:

`
postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
`

> Keep this secret server-side. Never expose it to the browser.

## Usage

`	s
import { sql } from '@/lib/postgres';

type ProfileRow = {
  id: string;
  display_name: string;
};

export async function listProfiles() {
  const rows = await sql<ProfileRow[]>select id, display_name from profiles limit 10;
  return rows;
}
`

The client reuses a singleton in development to avoid exhausting the connection pool. In production we enable SSL with ejectUnauthorized: false, matching Supabase requirements.

## Notes

- Keep queries inside server-only files (pp/api routes, server actions, edge/server functions).
- Prefer Supabase policies for access control—even when using Postgres.js directly, the same RLS rules apply.
- If you need transaction helpers, use wait sql.begin(async (tx) => { ... }) as described in [Supabase’s Postgres.js guide](https://supabase.com/docs/guides/database/postgres-js).
