"use client";

import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

import { contactConfig } from "@/config/contact";
import { billingSuffix, formatINR, isRecurring, type Plan } from "@/config/plans.types";
import { buildUpiUri, makeTransactionRef } from "@/lib/upi";

/**
 * Two payment paths in one modal:
 *
 *   A. Autopay (default) — POST /api/checkout creates a Razorpay subscription,
 *      the payer approves the mandate in their UPI app, and every month after
 *      that is automatic. This is what you want people to pick.
 *
 *   B. One-time QR — a dynamic `upi://pay` string with the amount locked in.
 *      Useful for the first payment, for people whose bank blocks mandates,
 *      and as a fallback when the gateway is down. It does NOT recur.
 *
 * The distinction is stated plainly in the UI rather than buried, because a
 * user who thinks a QR set up autopay will churn angrily in 30 days.
 */
export function UpiQrModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  // A lifetime plan cannot be put on autopay, so the switch is hidden and the
  // one-time QR — the only way to pay for it — is the only mode offered.
  const recurring = isRecurring(plan);
  const [mode, setMode] = useState<"autopay" | "qr">(recurring ? "autopay" : "qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const txnRef = useMemo(() => makeTransactionRef(plan.audience, plan.id), [plan]);

  const upiUri = useMemo(() => {
    try {
      return buildUpiUri({
        vpa: process.env.NEXT_PUBLIC_UPI_VPA ?? "bridgenow@okicici",
        payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? contactConfig.brandName,
        amountInPaise: plan.priceInPaise,
        transactionRef: txnRef,
        note: `${plan.nameTop} ${plan.nameBottom}`,
      });
    } catch {
      return null;
    }
  }, [plan, txnRef]);

  // Render the QR client-side — no third-party QR image service ever sees
  // a payment URI.
  useEffect(() => {
    if (mode !== "qr" || !upiUri) return;
    let cancelled = false;
    QRCode.toDataURL(upiUri, {
      width: 460,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1A0520", light: "#FFFFFF" },
    })
      .then((url) => !cancelled && setQrDataUrl(url))
      .catch(() => !cancelled && setError("Could not render the QR code."));
    return () => {
      cancelled = true;
    };
  }, [mode, upiUri]);

  // Esc to close + focus trap entry
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function startAutopay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: plan.id, audience: plan.audience }),
      });
      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/auth?role=${plan.audience}&next=/pricing`;
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      // Razorpay hosted authorization page — handles the UPI mandate approval.
      if (data.shortUrl) window.location.href = data.shortUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`Subscribe to ${plan.nameTop} ${plan.nameBottom}`}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[28px] bg-plum-700 p-7 shadow-block outline-none"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Checkout</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight">
                {plan.nameTop} <span className="text-hot-light">{plan.nameBottom}</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-chalk-faint transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold">{formatINR(plan.priceInPaise)}</span>
            <span className="text-sm text-chalk-faint">{billingSuffix(plan)}</span>
          </div>

          {/* Mode switch — only meaningful when the plan actually recurs */}
          {recurring && (
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.08] p-1">
            {(
              [
                ["autopay", "UPI Autopay"],
                ["qr", "One-time QR"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`rounded-xl py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.12em] transition-colors
                            ${mode === k ? "bg-hot-wash text-white" : "text-chalk-dim hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
          )}

          {mode === "autopay" ? (
            <div className="mt-6">
              <ul className="space-y-2.5 text-sm text-chalk-dim">
                <Bullet>Approve once in your UPI app — renews automatically each month.</Bullet>
                <Bullet>We email you 24 hours before every debit.</Bullet>
                <Bullet>Cancel the mandate anytime from your dashboard or UPI app.</Bullet>
              </ul>
              <button onClick={startAutopay} disabled={busy} className="btn bg-hot-wash text-white mt-7 w-full justify-center disabled:opacity-60">
                {busy ? "Opening your bank…" : "Set up autopay"}
              </button>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-glow-hot">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qrDataUrl} alt="UPI payment QR code" className="h-56 w-56 rounded-xl" />
                ) : (
                  <div className="h-56 w-56 animate-pulse rounded-xl bg-white/[0.08]" />
                )}
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-chalk-faint">
                Ref {txnRef}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-chalk-dim">
                Scan with any UPI app.{" "}
                {recurring ? (
                  <>
                    This is a <strong className="font-semibold text-white">one-time</strong> payment
                    — it does not set up autopay.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-white">Creator Basic is lifetime</strong> —
                    pay once, no renewal and nothing to cancel.
                  </>
                )}
              </p>
              {upiUri && (
                <a href={upiUri} className="btn border-2 border-white/40 text-white mt-5 w-full justify-center sm:hidden">
                  Open UPI app
                </a>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-lime-deep/40 bg-lime/15 px-4 py-2.5 text-xs text-lime">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-[11px] leading-relaxed text-chalk-faint">
            Payments secured by Razorpay · NPCI UPI
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-0.5 font-bold text-hot-light">
        →
      </span>
      <span>{children}</span>
    </li>
  );
}
