"use client";

declare global {
  interface Window {
    ResizeObserver: typeof ResizeObserver;
  }
}

if (typeof window !== "undefined" && typeof window.ResizeObserver === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ResizeObserverPolyfill = require("resize-observer-polyfill").default;
    if (ResizeObserverPolyfill) {
      window.ResizeObserver = ResizeObserverPolyfill;
    }
  } catch (error) {
    console.error("Failed to load ResizeObserver polyfill", error);
  }
}

/**
 * noop component whose module side-effect ensures ResizeObserver exists before Radix mounts.
 */
export function EnsureResizeObserver() {
  return null;
}
