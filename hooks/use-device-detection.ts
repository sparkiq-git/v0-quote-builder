"use client"

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-desktop'

export interface DeviceInfo {
  type: DeviceType
  width: number
  height: number
  isTouch: boolean
  isLandscape: boolean
}

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    width: 1024,
    height: 768,
    isTouch: false,
    isLandscape: true,
  })

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isLandscape = width > height

      let type: DeviceType = 'desktop'
      
      if (width < 640) {
        type = 'mobile'
      } else if (width < 1024) {
        type = 'tablet'
      } else if (width < 1440) {
        type = 'desktop'
      } else {
        type = 'large-desktop'
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

    // Listen for resize events
    window.addEventListener('resize', updateDeviceInfo)
    
    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

// Device-specific layout configurations
export const deviceLayouts = {
  mobile: {
    cardLayout: 'stacked',
    imageAspectRatio: '16/9',
    spacing: 'compact',
    typography: 'small',
    interactions: 'touch-optimized',
  },
  tablet: {
    cardLayout: 'side-by-side',
    imageAspectRatio: '4/3',
    spacing: 'comfortable',
    typography: 'medium',
    interactions: 'hybrid',
  },
  desktop: {
    cardLayout: 'side-by-side',
    imageAspectRatio: '16/10',
    spacing: 'generous',
    typography: 'large',
    interactions: 'mouse-optimized',
  },
  'large-desktop': {
    cardLayout: 'side-by-side',
    imageAspectRatio: '21/9',
    spacing: 'luxurious',
    typography: 'extra-large',
    interactions: 'mouse-optimized',
  },
} as const

export type DeviceLayout = typeof deviceLayouts[keyof typeof deviceLayouts]
