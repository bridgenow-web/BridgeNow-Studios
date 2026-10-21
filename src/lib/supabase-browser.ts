import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 *
 * `remember` controls how long the session cookie survives:
 *   true  → 30 days, so the user stays signed in across browser restarts
 *   false → a session cookie, cleared when the browser closes
 *
 * That is the entire mechanism behind the "Keep me signed in" checkbox. The
 * client is built at submit time rather than at render, because the cookie
 * lifetime has to be decided before the session is written.
 */
export const REMEMBER_ME_DAYS = 30;

export function getBrowserClient(remember: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // IMPORTANT: @supabase/ssr expects the cookie options used by the browser,
  // server and middleware clients to agree. The server and middleware clients
  // use defaults, so the only thing varied here is maxAge — overriding path,
  // sameSite or secure on one side only produces cookies the other side
  // writes back differently, which logs the user straight out again.
  if (!remember) return createBrowserClient(url, key);

  return createBrowserClient(url, key, {
    cookieOptions: { maxAge: REMEMBER_ME_DAYS * 24 * 60 * 60 },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Supabase returns terse codes; these are what a user can act on. */
export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the verification link.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "That email already has an account. Log in instead.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (m.includes("password should be")) return "Password must be at least 8 characters.";
  return message;
}
