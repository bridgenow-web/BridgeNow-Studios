import { NextResponse } from "next/server";

import { runRenewalReminders } from "@/workers/renewal-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * T-24h pre-expiry reminder sweep.
 *
 * Deploy as a Vercel Cron (vercel.json below) or hit it from any scheduler.
 * Runs hourly, not daily: a daily job means someone renewing at 23:50 gets a
 * reminder 23 hours early or 1 hour late. Hourly keeps everyone inside a
 * 24h ± 1h window, and the dedupe key makes re-runs free.
 *
 *   // vercel.json
 *   { "crons": [{ "path": "/api/cron/renewal-reminders", "schedule": "0 * * * *" }] }
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET`. Any other caller
 * without it gets 401, so this endpoint is not a free email cannon.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const result = await runRenewalReminders();

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    ...result,
  });
}
