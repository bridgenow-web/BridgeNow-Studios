import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Shape `@supabase/ssr` hands to `setAll`. Typed explicitly so the callback
 *  isn't inferred as `any` under `noImplicitAny`. */
type CookieToSet = { name: string; value: string; options: CookieOptions };

import { prisma } from "@/lib/db";
import type { Audience } from "@/config/plans.types";

/** Supabase server client bound to the request's cookies. */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: CookieToSet[]) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // called from a Server Component — middleware refreshes instead
          }
        },
      },
    },
  );
}

export interface SessionProfile {
  id: string;
  email: string;
  role: "creator" | "brand" | "admin";
  fullName: string | null;
  phone: string | null;
}

const SELECT = { id: true, email: true, role: true, fullName: true, phone: true } as const;

/**
 * Resolves the signed-in user's profile, creating the row if it is missing.
 *
 * Normally `bn_handle_new_user` (a Postgres trigger on auth.users) writes this
 * row at sign-up. But a user created BEFORE that trigger existed — or in any
 * project where the SQL migration hasn't been run — would authenticate fine
 * and then have no profile, which sends `requireRole` into a redirect loop
 * back to /auth. Self-healing here makes the trigger an optimisation rather
 * than a hard dependency, and costs one extra query only on the miss.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser();
  if (!user) return null;

  const existing = await prisma.profile.findUnique({ where: { id: user.id }, select: SELECT });
  if (existing) return existing as SessionProfile;

  // Role and name come from the metadata set at signUp().
  const meta = (user.user_metadata ?? {}) as { role?: string; full_name?: string };
  const role = meta.role === "brand" ? "brand" : "creator";

  try {
    const created = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email ?? `${user.id}@placeholder.local`,
        role,
        fullName: meta.full_name?.trim() || null,
      },
      select: SELECT,
    });
    return created as SessionProfile;
  } catch {
    // Lost a race with the trigger (or a concurrent request) — read it back.
    const raced = await prisma.profile.findUnique({ where: { id: user.id }, select: SELECT });
    return (raced as SessionProfile) ?? null;
  }
}

/**
 * Guard for any role-specific route. /app itself serves both roles and uses
 * getSessionProfile directly; this stays for routes that are one role only.
 */
export async function requireRole(audience: Audience): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect(`/auth?role=${audience}&next=/app`);
  if (profile.role !== audience && profile.role !== "admin") {
    redirect("/app");
  }
  return profile;
}

/** Entitlement check used by premium surfaces. Mirrors bn_has_active_*_plan(). */
export async function hasActivePlan(profile: SessionProfile): Promise<boolean> {
  const where = { status: { in: ["active", "grace_period"] as const } };
  if (profile.role === "brand") {
    return (
      (await prisma.brandSubscription.count({ where: { ...where, brandId: profile.id } })) > 0
    );
  }
  return (await prisma.creatorSubscription.count({ where: { ...where, userId: profile.id } })) > 0;
}
