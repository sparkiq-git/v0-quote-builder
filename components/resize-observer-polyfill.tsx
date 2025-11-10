"use client";

import { useEffect } from "react";

/**
 * Ensures ResizeObserver is available in environments (or browsers) that disable it.
 * Radix UI requires ResizeObserver for positioning overlays like DropdownMenu.
 */
export function EnsureResizeObserver() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.ResizeObserver !== "undefined") return;

    let cancelled = false;

    import("resize-observer-polyfill")
      .then(({ default: ResizeObserverPolyfill }) => {
        if (cancelled) return;
        window.ResizeObserver = ResizeObserverPolyfill;
      })
      .catch((error) => {
        console.error("Failed to load ResizeObserver polyfill", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

