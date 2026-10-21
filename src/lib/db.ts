import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Supabase's transaction pooler (port 6543, PgBouncer) reuses backend
 * connections between statements, so Prisma's named prepared statements
 * collide and Postgres raises 42P05: `prepared statement "s0" already exists`.
 *
 * `pgbouncer=true` turns prepared statements off; `connection_limit=1` keeps a
 * dev server from exhausting the pool on hot reloads. Both are appended here
 * rather than left to the .env, because the connection string Supabase hands
 * you in the dashboard does not include them and the failure it produces looks
 * like an auth bug, not a database one.
 *
 * Does not touch DIRECT_URL — migrations need prepared statements and run
 * against the session pooler on 5432.
 */
function poolerSafeUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    const isPooled = url.port === "6543" || url.hostname.includes("pooler.");
    if (!isPooled) return raw;
    if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
    return url.toString();
  } catch {
    return raw; // unparseable — let Prisma report it
  }
}

const datasourceUrl = poolerSafeUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Days of continued access after a failed debit. Mirrors bn_grace_days(). */
export const GRACE_DAYS = 3;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
