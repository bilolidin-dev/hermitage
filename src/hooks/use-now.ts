"use client";

import { useSyncExternalStore } from "react";

/**
 * Current time, rounded to `intervalMs`, re-rendering on each tick.
 * Returns null during server rendering and hydration so relative times
 * never differ between server and client.
 */
export function useNow(intervalMs = 30_000): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => null,
  );
}
