"use client";

import { useEffect } from "react";

/** Total intro length in ms; keep in sync with the `.site-intro` animation in globals.css. */
export const INTRO_DURATION_MS = 1500;

/**
 * The pre-paint intro script.
 *
 * In the server HTML it is a normal inline script, so the browser runs it
 * while parsing, before the first paint. When React renders this component on
 * the client (hydration, or a remount on a language switch) it uses a
 * non-executable `type`, which React treats as a data block: the code is not
 * run a second time and React does not warn about script tags. During
 * hydration React leaves the server-rendered attributes in place, so the
 * deliberate `type` difference is covered by `suppressHydrationWarning`.
 */
export function IntroScript({ code }: { code: string }) {
  const onServer = typeof window === "undefined";
  return (
    <script
      type={onServer ? undefined : "application/json"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

/**
 * Removes `data-intro` once the intro has finished, so a layout that remounts
 * later (e.g. on a language switch) can never replay it. Renders nothing.
 */
export function IntroCleanup() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;
    const id = window.setTimeout(() => root.removeAttribute("data-intro"), INTRO_DURATION_MS + 100);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}

/**
 * Seconds to postpone a page's own entrance animation while the intro is on
 * screen. Read once at first render; the value does not affect markup, so it
 * cannot cause a hydration mismatch.
 */
export function introOffsetSeconds(): number {
  if (typeof document === "undefined") return 0;
  return document.documentElement.dataset.intro === "play" ? 0.85 : 0;
}
