"use client"

import { useState, useEffect } from "react"

export interface AircraftModelData {
  id: string
  name: string
  manufacturer: string
  defaultCapacity?: number
  defaultRangeNm?: number
  defaultSpeedKnots?: number
  images: string[]
  isArchived?: boolean
}

export function useAircraftModels() {
  const [models, setModels] = useState<AircraftModelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/models')
        
        if (!response.ok) {
          throw new Error('Failed to fetch aircraft models')
        }
        
        const { data } = await response.json()
        
        // Transform the data to match the expected format
        const transformedData = data.map((model: any) => ({
          id: model.id,
          name: model.name,
          manufacturer: model.aircraft_manufacturer?.name || 'Unknown',
          defaultCapacity: model.size_code ? parseInt(model.size_code) : 8,
          defaultRangeNm: 2000, // Default range
          defaultSpeedKnots: 400, // Default speed
          images: model.aircraft_model_image
            ?.sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1
              if (!a.is_primary && b.is_primary) return 1
              return a.display_order - b.display_order
            })
            .map((img: any) => img.public_url)
            .filter(Boolean) || [],
          isArchived: false, // Default to not archived
        }))
        
        setModels(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching aircraft models:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  return { models, loading, error }
}