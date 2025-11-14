"use client"

import { useState, useEffect, useCallback } from "react"

export interface AircraftSizeData {
  code: string
  display_name: string
  description?: string | null
  aircraft_pref?: string | null
  size?: number | null
}

export function useAircraftSizes() {
  const [sizes, setSizes] = useState<AircraftSizeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSizes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/aircraft-sizes')
      
      if (!response.ok) {
        throw new Error('Failed to fetch aircraft sizes')
      }
      
      const { data } = await response.json()
      setSizes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching aircraft sizes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSizes()
  }, [fetchSizes])

  const createSize = useCallback(async (sizeData: { code: string; display_name: string; description?: string | null; aircraft_pref?: string | null; size?: number | null }) => {
    try {
      const response = await fetch('/api/aircraft-sizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sizeData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create aircraft size')
      }

      const { data } = await response.json()
      
      // Refresh sizes list
      await fetchSizes()
      
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create aircraft size'
      console.error('Error creating aircraft size:', err)
      return { success: false, error: errorMessage }
    }
  }, [fetchSizes])

  return { sizes, loading, error, refetch: fetchSizes, createSize }
}
