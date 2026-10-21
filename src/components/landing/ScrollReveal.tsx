"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for every `.reveal` on the page.
 *
 * The `js` class is added to <html> at runtime, so without JavaScript — and in
 * the first paint before hydration — every section is already visible. That
 * matters: a page whose content starts at opacity 0 waiting for an observer
 * shows a blank screen to crawlers, to link previews, and to anyone whose JS
 * is slow.
 *
 * A MutationObserver watches for `.reveal` elements added AFTER mount. Without
 * it, anything React swaps in later is never observed and stays at opacity 0
 * forever — which is exactly what happened when the pricing toggle replaced
 * the creator cards with the brand ones: the section went blank.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Everything in `scope` that has not been revealed yet. */
    const pending = (scope: ParentNode) =>
      Array.from(scope.querySelectorAll<HTMLElement>(".reveal:not(.in)"));

    if (reduced) {
      const showAll = (scope: ParentNode) =>
        pending(scope).forEach((el) => el.classList.add("in"));
      showAll(document);

      const mo = new MutationObserver((records) => {
        for (const r of records) {
          r.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;
            if (n.classList.contains("reveal")) n.classList.add("in");
            showAll(n);
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });

      return () => {
        mo.disconnect();
        root.classList.remove("js");
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.delay ?? 0);
          window.setTimeout(() => el.classList.add("in"), delay);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    const watch = (scope: ParentNode) => pending(scope).forEach((el) => io.observe(el));
    watch(document);

    // Catch anything mounted later — toggled tabs, lazily rendered sections.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.classList.contains("reveal") && !n.classList.contains("in")) io.observe(n);
          watch(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      root.classList.remove("js");
    };
  }, []);

  return null;
}
