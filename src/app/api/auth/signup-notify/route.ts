import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/auth";
import { sendTransactional } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends the "your account is ready" email right after sign-up.
 *
 * This replaces Supabase's confirmation link. The account is already usable;
 * this email is a record that it was created, not a gate in front of it.
 *
 * Security: the recipient is read from the session, never from the request
 * body. The client is signed in for the moment between signUp() and signOut(),
 * and that session is the only thing this route trusts — so it can't be used
 * to send mail to an arbitrary address.
 *
 * The dedupe key is the profile id, so a retry or a double-submit sends once.
 */
export async function POST() {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const audience = profile.role === "brand" ? "brand" : "creator";
  const firstName = profile.fullName?.trim().split(/\s+/)[0] ?? profile.email.split("@")[0]!;

  const { sent, reason } = await sendTransactional({
    kind: "account_created",
    to: profile.email,
    userId: profile.id,
    dedupeKey: `account_created:${profile.id}`,
    context: {
      audience,
      firstName,
      planName: audience === "creator" ? "Creator account" : "Brand account",
      amountInPaise: 0,
      nextBillingDate: new Date(),
    },
  });

  // A failed email must never block sign-up — the account exists either way.
  return NextResponse.json({ sent, reason: reason ?? null });
}
