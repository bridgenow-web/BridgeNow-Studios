"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The floating pill nav.
 *
 * The bar never takes a background. It sits fully transparent over whatever is
 * passing underneath, so nothing is hidden behind it as you scroll — a frosted
 * panel still dimmed the content it covered.
 *
 * The links keep their own pills and a text shadow instead, which is what
 * carries legibility over a light section without putting a plate behind the
 * whole bar.
 */
export function SiteNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setSolid(window.scrollY > window.innerHeight * 0.72);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 rounded-full bg-transparent px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="BridgeNow — home" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="BridgeNow"
            width={819}
            height={291}
            priority
            className="h-7 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:h-8"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/#what"
            className={`hidden rounded-full px-4 py-2 font-display text-[12px] font-semibold transition-colors sm:inline-flex
                        ${solid
                          ? "bg-white/15 text-white ring-1 ring-white/25 backdrop-saturate-150 hover:bg-white/25"
                          : "bg-white text-sky-deep shadow-pill hover:-translate-y-0.5"}`}
          >
            What you get
          </Link>
          <Link
            href="/#pricing"
            className={`hidden rounded-full px-4 py-2 font-display text-[12px] font-semibold transition-colors sm:inline-flex
                        ${solid
                          ? "bg-white/15 text-white ring-1 ring-white/25 backdrop-saturate-150 hover:bg-white/25"
                          : "bg-white text-sky-deep shadow-pill hover:-translate-y-0.5"}`}
          >
            Plans
          </Link>
          <Link
            href="/auth?mode=signin"
            className={`inline-flex items-center rounded-full border px-4 py-2 font-display text-[12px] font-semibold transition-colors
                        ${solid
                          ? "border-white/40 text-white hover:bg-white/15"
                          : "border-white/55 text-white hover:bg-white/15"}`}
          >
            Log in
          </Link>
          <Link
            href="/auth?role=creator"
            className="inline-flex items-center rounded-full bg-lime px-4 py-2 font-display text-[12px]
                       font-semibold text-sky-deep shadow-pill transition-transform hover:-translate-y-0.5"
          >
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
