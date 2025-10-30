"use client"

import { useState, useEffect } from "react"

export type DeviceType = "mobile" | "tablet" | "desktop" | "large-desktop"

export interface DeviceInfo {
  type: DeviceType
  width: number
  height: number
  isTouch: boolean
  isLandscape: boolean
}

function isActualTablet(): boolean {
  if (typeof navigator === "undefined") return false

  const userAgent = navigator.userAgent.toLowerCase()
  const isTabletUA =
    /ipad/.test(userAgent) ||
    (/android/.test(userAgent) && !/mobile/.test(userAgent)) ||
    /tablet/.test(userAgent) ||
    /kindle/.test(userAgent) ||
    /playbook/.test(userAgent) ||
    /silk/.test(userAgent)

  return isTabletUA
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: "desktop",
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
    isTouch: false,
    isLandscape: true,
  })

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0
      const isLandscape = width > height
      const isTabletDevice = isActualTablet()

      let type: DeviceType = "desktop"

      // mobile: < 768px (below md)
      // tablet: 768px - 1024px (md to lg)
      // desktop: 1024px - 1536px (lg to 2xl)
      // large-desktop: >= 1536px (2xl and above)

      if (width < 768) {
        type = "mobile"
      } else if (width < 1024) {
        if (isTabletDevice || (isTouch && width <= 1024)) {
          type = "tablet"
        } else {
          // Small desktop window
          type = "tablet"
        }
      } else if (width < 1536) {
        if (isTabletDevice) {
          type = "tablet"
        } else {
          type = "desktop"
        }
      } else {
        type = "large-desktop"
      }

      setDeviceInfo({
        type,
        width,
        height,
        isTouch,
        isLandscape,
      })
    }

    // Initial detection
    updateDeviceInfo()

    const debouncedUpdate = debounce(updateDeviceInfo, 150)
    window.addEventListener("resize", debouncedUpdate)

    window.addEventListener("orientationchange", updateDeviceInfo)

    return () => {
      window.removeEventListener("resize", debouncedUpdate)
      window.removeEventListener("orientationchange", updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

// Device-specific layout configurations
export const deviceLayouts = {
  mobile: {
    cardLayout: "stacked",
    imageAspectRatio: "16/9",
    spacing: "compact",
    typography: "small",
    interactions: "touch-optimized",
  },
  tablet: {
    cardLayout: "side-by-side",
    imageAspectRatio: "4/3",
    spacing: "comfortable",
    typography: "medium",
    interactions: "hybrid",
  },
  desktop: {
    cardLayout: "side-by-side",
    imageAspectRatio: "16/10",
    spacing: "generous",
    typography: "large",
    interactions: "mouse-optimized",
  },
  "large-desktop": {
    cardLayout: "side-by-side",
    imageAspectRatio: "21/9",
    spacing: "luxurious",
    typography: "extra-large",
    interactions: "mouse-optimized",
  },
} as const

export type DeviceLayout = (typeof deviceLayouts)[keyof typeof deviceLayouts]
