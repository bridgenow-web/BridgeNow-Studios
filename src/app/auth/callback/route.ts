import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/auth";

/**
 * Handles every link Supabase emails: email confirmation at sign-up and
 * password recovery. Exchanges the code for a session cookie, then routes.
 *
 * Recovery links go to /auth/update-password regardless of `next`, because the
 * user has a session but still needs to choose a password.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type"); // "recovery" | "signup" | ...
  const next = url.searchParams.get("next") ?? "/app";

  const errorDescription = url.searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(errorDescription)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_code", url.origin));
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const destination = type === "recovery" ? "/auth/update-password" : next;
  return NextResponse.redirect(new URL(destination, url.origin));
}
