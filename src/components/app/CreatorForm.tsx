"use client";

import { useState } from "react";

import { contactConfig } from "@/config/contact";

/**
 * The creator application, embedded.
 *
 * Google blocks framing on some networks and extensions break it more often,
 * so the iframe is paired with a visible "open in a new tab" escape. An embed
 * that silently shows nothing is worse than a link.
 */
export function CreatorForm() {
  const form = contactConfig.forms.creatorApplication;
  const [open, setOpen] = useState(false);

  return (
    <section id="apply" className="block-card bg-plum-700 p-7 sm:p-9">
      <p className="display text-[12px] tracking-[0.24em] text-hot-light">STEP 1</p>
      <h2 className="mt-3 display text-big text-white">
        Complete your creator application
      </h2>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-chalk-dim">
        Your niche, region and audience — so we can place you in the right community and surface
        you to the right brands.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setOpen((v) => !v)} className="btn bg-hot-wash text-white sweep">
          {open ? "Hide the form" : "Fill it in here"}
        </button>
        <a href={form.shortUrl} target="_blank" rel="noreferrer" className="btn border-2 border-white/40 text-white hover:bg-white/10">
          Open in a new tab
        </a>
      </div>

      {open && (
        <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white">
          <iframe
            src={form.embedUrl}
            title="BridgeNow creator application"
            className="h-[760px] w-full"
            loading="lazy"
          />
        </div>
      )}

      {open && (
        <p className="mt-3 text-[12px] text-chalk-faint">
          Form not loading? Some networks block embedded Google Forms — use the new-tab link above.
        </p>
      )}
    </section>
  );
}
