import { Resend } from "resend";

import { channelsFor } from "@/config/contact";
import type { Audience } from "@/config/plans.types";
import { prisma } from "@/lib/db";
import { templates, type EmailContext } from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export type TransactionalKind = keyof typeof templates;

export interface SendArgs {
  kind: TransactionalKind;
  to: string;
  userId: string;
  /**
   * Idempotency key. Same key twice ⇒ second send is a no-op.
   * Convention: `<kind>:<subscriptionId>:<ISO date of the cycle>`
   */
  dedupeKey: string;
  context: EmailContext;
}

/**
 * Role-aware transactional send.
 * Creator mail goes out as the creator identity and replies land in the
 * creator inbox; brand mail uses the general identity. The split is resolved
 * from `audience`, never passed in by the caller.
 */
export async function sendTransactional(args: SendArgs): Promise<{ sent: boolean; reason?: string }> {
  const { kind, to, userId, dedupeKey, context } = args;
  const channels = channelsFor(context.audience);

  // 1. Claim the dedupe key. Unique constraint = our lock.
  try {
    await prisma.emailLog.create({
      data: { userId, kind, dedupeKey, toEmail: to, status: "queued" },
    });
  } catch {
    return { sent: false, reason: "duplicate" }; // already queued or sent
  }

  const { subject, html, text } = templates[kind](context);
  const from = process.env[channels.fromEnvKey];
  const replyTo = process.env[channels.replyToEnvKey];

  if (!from) {
    await markFailed(dedupeKey, `Missing env ${channels.fromEnvKey}`);
    return { sent: false, reason: "missing_sender" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
      headers: {
        "X-Entity-Ref-ID": dedupeKey, // Gmail thread de-dup
        "List-Unsubscribe": `<mailto:${channels.supportEmail}?subject=unsubscribe>`,
      },
      tags: [
        { name: "kind", value: kind },
        { name: "audience", value: context.audience },
      ],
    });

    if (error) throw new Error(error.message);

    await prisma.emailLog.update({
      where: { dedupeKey },
      data: { status: "sent", sentAt: new Date(), providerMessageId: data?.id ?? null },
    });
    return { sent: true };
  } catch (err) {
    await markFailed(dedupeKey, err instanceof Error ? err.message : String(err));
    return { sent: false, reason: "provider_error" };
  }
}

async function markFailed(dedupeKey: string, error: string) {
  await prisma.emailLog
    .update({ where: { dedupeKey }, data: { status: "failed", error } })
    .catch(() => undefined);
}

/** `har••••@okaxis` — safe to put in an email body. */
export function maskVpa(vpa: string | null | undefined): string | undefined {
  if (!vpa?.includes("@")) return undefined;
  const [handle, psp] = vpa.split("@") as [string, string];
  const head = handle.slice(0, Math.min(3, handle.length));
  return `${head}${"•".repeat(Math.max(3, handle.length - 3))}@${psp}`;
}

export function dedupeKeyFor(
  kind: TransactionalKind,
  subscriptionId: string,
  cycleDate: Date,
): string {
  return `${kind}:${subscriptionId}:${cycleDate.toISOString().slice(0, 10)}`;
}

export type { EmailContext, Audience };
