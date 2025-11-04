import { useEffect } from "react"

/**
 * useDebouncedEffect
 * Runs an effect only after a given delay since the last dependency change.
 *
 * @param effect - The callback function to run after the delay.
 * @param deps - Dependency array for the effect.
 * @param delay - Delay in milliseconds (default 500ms).
 */
export function useDebouncedEffect(
  effect: () => void | (() => void | undefined),
  deps: any[],
  delay = 500
) {
  useEffect(() => {
    const handler = setTimeout(() => {
      effect()
    }, delay)

    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay])
}
