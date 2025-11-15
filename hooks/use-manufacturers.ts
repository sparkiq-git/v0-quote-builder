"use client"

import { useState, useEffect, useCallback } from "react"

export interface ManufacturerData {
  id: string
  name: string
}

export function useManufacturers() {
  const [manufacturers, setManufacturers] = useState<ManufacturerData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchManufacturers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/manufacturers")

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to fetch manufacturers")
      }

      const { data } = await response.json()
      setManufacturers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manufacturers")
      console.error("Error fetching manufacturers:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchManufacturers()
  }, [fetchManufacturers])

  const createManufacturer = useCallback(
    async (name: string) => {
      try {
        const response = await fetch("/api/manufacturers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || "Failed to create manufacturer")
        }

        const { data } = await response.json()
        await fetchManufacturers()
        return { success: true, data }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create manufacturer"
        console.error("Error creating manufacturer:", err)
        return { success: false, error: message }
      }
    },
    [fetchManufacturers],
  )

  return { manufacturers, loading, error, refetch: fetchManufacturers, createManufacturer }
}
