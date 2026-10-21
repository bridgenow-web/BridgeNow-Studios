"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { brandPlansConfig } from "@/config/brand-plans";
import { contactConfig } from "@/config/contact";
import { creatorPlansConfig } from "@/config/creator-plans";
import { formatINR, type Audience, type Plan } from "@/config/plans.types";
import { buildUpiUri, makeTransactionRef } from "@/lib/upi";

/**
 * Pay by UPI.
 *
 * The QR is generated in the browser from the chosen plan's amount, so the
 * payer cannot edit the figure and no third-party QR service ever sees a
 * payment URI. Each render gets a fresh reference you can match against the
 * bank statement.
 *
 * This is a ONE-TIME collect. A UPI QR cannot create a recurring mandate —
 * NPCI requires that to go through a PSP — so the copy says so plainly rather
 * than letting someone assume autopay is set up.
 */
export function UpiPayPanel({ audience }: { audience: Audience }) {
  const catalogue = audience === "creator" ? creatorPlansConfig : brandPlansConfig;
  const payable = catalogue.plans.filter((p) => p.priceInPaise > 0);

  const [planId, setPlanId] = useState(payable[0]?.id ?? "");
  const plan = payable.find((p) => p.id === planId) as Plan | undefined;

  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generated AFTER mount, never during render.
  //
  // makeTransactionRef() uses Date.now() and Math.random(), so computing it in
  // a useMemo produced one value on the server and a different one in the
  // browser — React then reported "Text content does not match server-rendered
  // HTML". Seeding it in an effect means the server renders a stable
  // placeholder and the real reference appears on the client.
  const [txnRef, setTxnRef] = useState("");
  useEffect(() => {
    if (plan) setTxnRef(makeTransactionRef(plan.audience, plan.id));
  }, [plan]);

  const uri = useMemo(() => {
    if (!plan || !txnRef) return null;
    try {
      return buildUpiUri({
        vpa: process.env.NEXT_PUBLIC_UPI_VPA ?? contactConfig.upi.vpa,
        payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? contactConfig.upi.payeeName,
        amountInPaise: plan.priceInPaise,
        transactionRef: txnRef,
        note: "BridgeNow",
        // The collection account is a personal VPA, not a merchant one.
        merchant: false,
      });
    } catch {
      return null;
    }
  }, [plan, txnRef]);

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    QRCode.toDataURL(uri, {
      width: 520,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#07070A", light: "#FFFFFF" },
    })
      .then((d) => !cancelled && setQr(d))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [uri]);

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(contactConfig.upi.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="pay" className="block-card bg-plum-700 p-7 sm:p-9">
      <p className="display text-[12px] tracking-[0.24em] text-hot-light">STEP 3</p>
      <h2 className="mt-3 display text-big text-white">
        PAY BY UPI
      </h2>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-chalk-dim">
        Pick your plan, scan, and send us the reference on WhatsApp. We activate within a few
        hours.
      </p>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk-faint">
            Choose a plan
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {payable.map((p) => {
              const active = p.id === planId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-200
                              ${active
                                ? "border-hot bg-hot/15"
                                : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold">
                      {p.nameTop.charAt(0) + p.nameTop.slice(1).toLowerCase()}{" "}
                      {p.nameBottom.charAt(0) + p.nameBottom.slice(1).toLowerCase()}
                    </span>
                    <span className="block text-[12px] text-chalk-faint">{p.billing}</span>
                  </span>
                  <span className={`shrink-0 display text-[17px] tabular-nums ${active ? "text-hot-light" : "text-chalk-dim"}`}>
                    {formatINR(p.priceInPaise)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-chalk-faint">UPI ID</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <code className="font-mono text-sm text-white">{contactConfig.upi.vpa}</code>
              <button onClick={copyVpa} className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-chalk-dim hover:text-white">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-chalk-faint">{contactConfig.upi.payeeName}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white p-3 shadow-glow-hot">
            {qr ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qr} alt={`UPI QR for ${plan ? formatINR(plan.priceInPaise) : ""}`} className="h-56 w-56 rounded-lg" />
            ) : (
              <div className="h-56 w-56 animate-pulse rounded-lg bg-plum-600" />
            )}
          </div>

          {plan && (
            <p className="mt-4 display text-[28px] tabular-nums text-hot-light">
              {formatINR(plan.priceInPaise)}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-faint">
            Ref {txnRef || "…"}
          </p>

          {uri && (
            <a href={uri} className="btn bg-hot-wash text-white mt-5 w-full sm:hidden">
              Open UPI app
            </a>
          )}

          <a
            href={`https://wa.me/${contactConfig.whatsapp.number.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hi BridgeNow — I've paid for ${plan?.nameTop} ${plan?.nameBottom}. Reference: ${txnRef}`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="btn border-2 border-white/40 text-white hover:bg-white/10 mt-3 w-full"
          >
            Send us the reference
          </a>
        </div>
      </div>

      <p className="mt-7 rounded-xl border border-lime/40 bg-lime/10 px-4 py-3 text-[12.5px] leading-relaxed text-lime">
        This is a one-time payment, not autopay. A UPI QR cannot set up a recurring mandate, so
        you will need to pay again next month until Razorpay autopay is switched on.
      </p>
    </section>
  );
}
