import { formatINR, type Audience } from "@/config/plans.types";
import { COLORS, button, detailRow, escapeHtml, featureList, renderShell } from "./base";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://bridgenow.in";

export interface EmailContext {
  audience: Audience;
  firstName: string;
  planName: string; // "Creator Plus"
  amountInPaise: number;
  nextBillingDate: Date;
  /** Masked UPI handle, e.g. "har••••@okaxis". Never the full VPA. */
  maskedVpa?: string;
  features?: string[];
  paymentId?: string;
  invoiceUrl?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

const h1 = (text: string, accent: string) => `
  <h1 class="h1" style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;
      font-size:30px;line-height:1.12;font-weight:700;letter-spacing:-0.8px;color:${COLORS.text};">
    ${escapeHtml(text)}<br><span style="color:${COLORS.gold};">${escapeHtml(accent)}</span>
  </h1>`;

const p = (text: string) => `
  <p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;
     line-height:1.65;color:${COLORS.muted};">${text}</p>`;

const eyebrow = (text: string) => `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;
     letter-spacing:3px;text-transform:uppercase;color:${COLORS.gold};padding-bottom:16px;">
     ${escapeHtml(text)}</div>`;

const detailsTable = (rows: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${COLORS.panelAlt};border-radius:14px;padding:6px 20px;margin:24px 0 4px;">
    ${rows}
  </table>`;

// ════════════════ 0. ACCOUNT CREATED (sign-up) ═════════════════
// Sent by BridgeNow itself, not by Supabase. No link to click to "activate" —
// the account already works. This is a record that it happened.

export function accountCreatedEmail(ctx: EmailContext): RenderedEmail {
  const loginUrl = `${APP}/auth?mode=signin`;
  const isCreator = ctx.audience === "creator";

  const body = `
    ${eyebrow("Account created")}
    ${h1("You're signed up,", `${ctx.firstName}.`)}
    ${p(
      isCreator
        ? "Your BridgeNow creator account is ready. Log in whenever you like — no link to click, no code to enter."
        : "Your BridgeNow brand account is ready. Log in whenever you like — no link to click, no code to enter.",
    )}

    ${detailsTable(
      detailRow("Account", ctx.planName) +
        detailRow("Signed up", fmtDate(new Date())),
    )}

    ${button("Log in", loginUrl)}

    ${p(
      `<span style="font-size:13px;color:${COLORS.dim}">You don't have a plan yet — browse the ${
        isCreator ? "creator" : "brand"
      } plans when you're ready. If you didn't create this account, reply to this email and we'll remove it.</span>`,
    )}`;

  return {
    subject: "Your BridgeNow account is ready",
    html: renderShell({
      audience: ctx.audience,
      preheader: "Your account is active. Log in any time.",
      body,
    }),
    text: [
      `You're signed up, ${ctx.firstName}.`,
      ``,
      `Your BridgeNow ${ctx.audience} account is ready.`,
      `Log in: ${loginUrl}`,
      ``,
      `If you didn't create this account, reply to this email.`,
    ].join("\n"),
  };
}

// ══════════════════════════ 1. WELCOME ══════════════════════════

export function welcomeEmail(ctx: EmailContext): RenderedEmail {
  const isCreator = ctx.audience === "creator";
  const cta = isCreator ? `${APP}/app` : `${APP}/app`;

  const body = `
    ${eyebrow("Subscription active")}
    ${h1("Welcome to BridgeNow,", `${ctx.firstName}.`)}
    ${p(
      isCreator
        ? "Your plan is live. You're in the creator pool brands actually search — regional, niche, and verified. Here's what just unlocked."
        : "Your plan is live. Creator discovery, campaign tools and deliverable tracking are open on your dashboard.",
    )}

    ${ctx.features?.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;">${featureList(ctx.features)}</table>` : ""}

    ${detailsTable(
      detailRow("Plan", ctx.planName) +
        detailRow("Billing", `${formatINR(ctx.amountInPaise)} / month`, true) +
        detailRow("Next debit", fmtDate(ctx.nextBillingDate)) +
        (ctx.maskedVpa ? detailRow("UPI autopay", ctx.maskedVpa) : ""),
    )}

    ${button(isCreator ? "Open your dashboard" : "Start a campaign", cta)}
    ${p(
      `<span style="font-size:13px;color:${COLORS.dim};">Autopay runs on the date above. We'll remind you 24 hours before every debit, and you can cancel the mandate from your dashboard or your UPI app at any time.</span>`,
    )}`;

  return {
    subject: isCreator
      ? `You're in — ${ctx.planName} is active`
      : `${ctx.planName} is active — let's find your creators`,
    html: renderShell({
      audience: ctx.audience,
      preheader: `${ctx.planName} is live. Next debit ${fmtDate(ctx.nextBillingDate)}.`,
      body,
    }),
    text: [
      `Welcome to BridgeNow, ${ctx.firstName}.`,
      ``,
      `${ctx.planName} is active.`,
      `Billing: ${formatINR(ctx.amountInPaise)} per month`,
      `Next debit: ${fmtDate(ctx.nextBillingDate)}`,
      ``,
      `Dashboard: ${cta}`,
    ].join("\n"),
  };
}

// ════════════════ 2. PRE-EXPIRY REMINDER (T-24h) ════════════════

export function preExpiryReminderEmail(ctx: EmailContext): RenderedEmail {
  const manageUrl = `${APP}/dashboard/${ctx.audience}/billing`;

  const body = `
    ${eyebrow("Renews tomorrow")}
    ${h1("Your plan renews", "in 24 hours.")}
    ${p(
      `Hi ${escapeHtml(ctx.firstName)} — a quick heads-up before your UPI autopay mandate executes. No action needed if you're staying with us.`,
    )}

    ${detailsTable(
      detailRow("Plan", ctx.planName) +
        detailRow("Amount", formatINR(ctx.amountInPaise), true) +
        detailRow("Debit date", fmtDate(ctx.nextBillingDate)) +
        (ctx.maskedVpa ? detailRow("From", ctx.maskedVpa) : ""),
    )}

    ${p(
      `<span style="font-size:13px;color:${COLORS.dim};">Keep enough balance in the linked account so the debit clears. If it fails, you keep access for 3 more days while we retry.</span>`,
    )}

    ${button("Manage subscription", manageUrl)}
    ${p(
      `<span style="font-size:13px;color:${COLORS.dim};">Want to change tier or cancel? Do it before the debit and the change applies immediately.</span>`,
    )}`;

  return {
    subject: `Renewing tomorrow — ${formatINR(ctx.amountInPaise)} for ${ctx.planName}`,
    html: renderShell({
      audience: ctx.audience,
      preheader: `${formatINR(ctx.amountInPaise)} will be debited on ${fmtDate(ctx.nextBillingDate)}.`,
      body,
    }),
    text: [
      `Hi ${ctx.firstName},`,
      ``,
      `Your ${ctx.planName} renews in 24 hours.`,
      `Amount: ${formatINR(ctx.amountInPaise)}`,
      `Debit date: ${fmtDate(ctx.nextBillingDate)}`,
      ``,
      `Manage: ${manageUrl}`,
    ].join("\n"),
  };
}

// ══════════════════ 3. RENEWAL CONFIRMATION ═════════════════════

export function renewalSuccessEmail(ctx: EmailContext): RenderedEmail {
  const body = `
    ${eyebrow("Payment received")}
    ${h1("Renewed.", "You're good for another month.")}
    ${p(
      `Thanks, ${escapeHtml(ctx.firstName)} — the autopay debit went through and your plan rolls on without interruption.`,
    )}

    ${detailsTable(
      detailRow("Plan", ctx.planName) +
        detailRow("Amount paid", formatINR(ctx.amountInPaise), true) +
        detailRow("Paid on", fmtDate(new Date())) +
        (ctx.paymentId ? detailRow("Reference", ctx.paymentId) : "") +
        detailRow("Next debit", fmtDate(ctx.nextBillingDate)),
    )}

    ${ctx.invoiceUrl ? button("Download invoice", ctx.invoiceUrl) : button("Open dashboard", `${APP}/dashboard/${ctx.audience}`)}
    ${p(
      `<span style="font-size:13px;color:${COLORS.dim};">Keep this email for your records. GST invoices are available in your billing history.</span>`,
    )}`;

  return {
    subject: `Payment received — ${ctx.planName} renewed`,
    html: renderShell({
      audience: ctx.audience,
      preheader: `${formatINR(ctx.amountInPaise)} received. Next debit ${fmtDate(ctx.nextBillingDate)}.`,
      body,
    }),
    text: [
      `Payment received.`,
      ``,
      `${ctx.planName} — ${formatINR(ctx.amountInPaise)}`,
      ctx.paymentId ? `Reference: ${ctx.paymentId}` : "",
      `Next debit: ${fmtDate(ctx.nextBillingDate)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export const templates = {
  account_created: accountCreatedEmail,
  welcome: welcomeEmail,
  pre_expiry_reminder: preExpiryReminderEmail,
  renewal_success: renewalSuccessEmail,
} as const;
