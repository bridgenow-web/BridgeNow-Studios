/**
 * UPI deep-link / QR string builder.
 *
 * Format is NPCI's UPI Linking Specification: a `upi://pay` URI whose query
 * params every Indian UPI app understands. Encoding the exact amount makes it
 * a *dynamic* QR — the payer cannot edit the figure, which is what you want
 * for plan purchases.
 *
 * Caveat worth knowing: a plain UPI QR is a ONE-TIME collect. It cannot create
 * a recurring mandate — NPCI requires mandate registration through a PSP. Use
 * this for manual/first payments and fallbacks; use Razorpay Subscriptions
 * (src/lib/razorpay.ts) for actual autopay.
 */

export interface UpiPayload {
  /**
   * `true` only for a VPA registered as a MERCHANT with the PSP.
   *
   * `tr` (transaction reference) and `tid` are merchant fields. Sending them
   * to an ordinary personal VPA — a Google Pay or PhonePe handle like
   * `name@oksbi` — makes the payer's app treat the collect as a merchant
   * transaction against an account that was never onboarded as one, and the
   * bank declines it. That is the usual cause of a QR that scans fine and
   * then fails at the moment of payment.
   *
   * For a personal VPA leave this false: the reference travels in the note
   * (`tn`) instead, which still shows up in the payer's history and in your
   * bank statement narration.
   */
  merchant?: boolean;
  /** Payee VPA, e.g. "bridgenow@okicici" */
  vpa: string;
  /** Payee name as it should appear in the payer's app. */
  payeeName: string;
  /** Amount in paise — converted to rupees with 2 decimals. */
  amountInPaise: number;
  /** Your order reference. Shows up in settlement reports. */
  transactionRef: string;
  /** Note shown to the payer. Keep under ~50 chars. */
  note?: string;
  currency?: "INR";
}

const VPA_PATTERN = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export function buildUpiUri(payload: UpiPayload): string {
  const {
    vpa,
    payeeName,
    amountInPaise,
    transactionRef,
    note,
    currency = "INR",
    merchant = false,
  } = payload;

  if (!VPA_PATTERN.test(vpa)) throw new Error(`Invalid UPI VPA: ${vpa}`);
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error("amountInPaise must be a positive integer");
  }

  // UPI wants rupees with exactly two decimals.
  const amount = (amountInPaise / 100).toFixed(2);

  // Note copy carries the reference so you can still reconcile a personal
  // collection against a bank statement. UPI notes are capped around 50
  // characters by most apps, so keep it tight.
  const noteText = (note ? `${note} ${transactionRef}` : `BridgeNow ${transactionRef}`).slice(0, 48);

  // The query string is assembled BY HAND, deliberately.
  //
  // URLSearchParams percent-encodes `@` to `%40`. RFC 3986 allows `@`
  // unencoded in a query, and UPI apps read `pa` literally without decoding
  // it — so an encoded VPA makes the app look up an account named
  // "name%40oksbi", which does not exist. The payer sees "payment could not
  // be processed to this account" and nothing in the code looks wrong.
  //
  // Google Pay's own QR codes leave the `@` literal. So do we.
  const parts: string[] = [
    `pa=${encodeVpa(vpa)}`,
    `pn=${encodeUpiText(payeeName)}`,
    `am=${amount}`,
    `cu=${currency}`,
    `tn=${encodeUpiText(noteText)}`,
  ];

  // Merchant-only fields. See `merchant` above.
  if (merchant) parts.push(`tr=${encodeUpiText(transactionRef)}`);

  return `upi://pay?${parts.join("&")}`;
}

/**
 * Encodes a VPA for the `pa` parameter, leaving `@`, `.`, `-` and `_` literal.
 *
 * Those four are the only characters a valid VPA contains besides
 * alphanumerics, and all are legal unencoded in a query string.
 */
function encodeVpa(vpa: string): string {
  return encodeURIComponent(vpa).replace(/%40/g, "@");
}

/** Spaces as %20, never `+` — UPI apps do not treat `+` as a space. */
function encodeUpiText(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "%20");
}

/** `bn_<audience>_<tier>_<timestamp36>` — readable in a settlement CSV. */
export function makeTransactionRef(audience: string, tier: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BN${audience[0]!.toUpperCase()}${tier.split("_").pop()!.slice(0, 3).toUpperCase()}${stamp}${rand}`;
}
