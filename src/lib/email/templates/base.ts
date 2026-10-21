import { contactConfig } from "@/config/contact";
import type { Audience } from "@/config/plans.types";

/**
 * Email shell. Table-based, inline styles, 600px — because Outlook.
 * Dark background with the gold accent, matching the brochure.
 * Tested shape: Gmail (web/iOS/Android), Apple Mail, Outlook 2019+, Superhuman.
 */

export interface ShellArgs {
  audience: Audience;
  preheader: string;
  /** Inner HTML — already-escaped content blocks. */
  body: string;
}

export const COLORS = {
  bg: "#FAFAF9",     // outer canvas
  panel: "#FFFFFF",  // the card itself
  panelAlt: "#F5F4F2", // inset details table
  gold: "#5B3DF5",   // accent (name kept so templates don't churn)
  goldSoft: "#4A2EE0",
  text: "#0C0A09",
  muted: "#57534E",
  dim: "#8A8580",
  rule: "#E7E5E2",
} as const;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr><td align="center" bgcolor="${COLORS.gold}" style="border-radius:8px;">
      <a href="${href}" target="_blank"
         style="display:inline-block;padding:15px 34px;font-family:'Helvetica Neue',Arial,sans-serif;
                font-size:13px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;
                color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

export function detailRow(label: string, value: string, emphasis = false): string {
  return `
  <tr>
    <td style="padding:11px 0;border-bottom:1px solid ${COLORS.rule};
               font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;
               color:${COLORS.muted};letter-spacing:0.3px;">${escapeHtml(label)}</td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid ${COLORS.rule};
               font-family:'Helvetica Neue',Arial,sans-serif;font-size:${emphasis ? "16px" : "13px"};
               font-weight:${emphasis ? "700" : "600"};
               color:${emphasis ? COLORS.gold : COLORS.text};">${escapeHtml(value)}</td>
  </tr>`;
}

export function featureList(items: string[]): string {
  return items
    .map(
      (i) => `
    <tr><td style="padding:7px 0;font-family:'Helvetica Neue',Arial,sans-serif;
                   font-size:14px;line-height:1.5;color:${COLORS.text};">
      <span style="color:${COLORS.gold};font-weight:700;">&rarr;</span>&nbsp;&nbsp;${escapeHtml(i)}
    </td></tr>`,
    )
    .join("");
}

export function renderShell({ audience, preheader, body }: ShellArgs): string {
  const supportEmail =
    audience === "creator" ? contactConfig.email.creator : contactConfig.email.general;
  const ig = contactConfig.social.instagram;
  const li = contactConfig.social.linkedin;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(contactConfig.brandName)}</title>
<!--[if mso]><style>body,table,td{font-family:Arial,sans-serif !important}</style><![endif]-->
<style>
  @media only screen and (max-width:620px){
    .wrap{width:100% !important}
    .pad{padding-left:22px !important;padding-right:22px !important}
    .h1{font-size:28px !important;line-height:1.15 !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${COLORS.bg};padding:36px 12px;">
    <tr><td align="center">

      <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:600px;max-width:600px;">

        <!-- Masthead -->
        <tr><td class="pad" style="padding:0 40px 24px;">
          <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;
                       letter-spacing:-0.5px;color:${COLORS.text};">Bridge<span
                style="color:${COLORS.gold};">Now</span></span>
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                      letter-spacing:2.2px;text-transform:uppercase;color:${COLORS.dim};
                      padding-top:5px;">${escapeHtml(contactConfig.shortTagline)}</div>
        </td></tr>

        <!-- Panel -->
        <tr><td style="background:${COLORS.panel};border:1px solid ${COLORS.rule};border-radius:14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height:3px;background:${COLORS.gold};
                           border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr><td class="pad" style="padding:38px 40px 40px;">${body}</td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td class="pad" style="padding:28px 40px 0;
                   font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;
                   line-height:1.7;color:${COLORS.dim};">
          Questions? Reply to this email or write to
          <a href="mailto:${supportEmail}" style="color:${COLORS.muted};">${supportEmail}</a>.<br>
          WhatsApp <a href="https://wa.me/${contactConfig.whatsapp.number.replace(/\D/g, "")}"
             style="color:${COLORS.muted};">${escapeHtml(contactConfig.whatsapp.display)}</a>
          &nbsp;·&nbsp;
          <a href="${ig.url}" style="color:${COLORS.muted};">Instagram ${escapeHtml(ig.handle)}</a>
          ${li ? `&nbsp;·&nbsp;<a href="${li.url}" style="color:${COLORS.muted};">${escapeHtml(li.label)}</a>` : ""}
          <div style="padding-top:16px;color:#A8A29E;">
            © ${new Date().getFullYear()} ${escapeHtml(contactConfig.brandName)}. You are receiving this
            because you hold an active ${audience} plan.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
