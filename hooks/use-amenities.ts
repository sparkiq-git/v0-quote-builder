"use client"

import { useState, useEffect } from "react"

export interface Amenity {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  meta?: any
  created_at: string
  icon_type?: string
  icon_ref?: string
}

export interface AircraftAmenity {
  id: string
  tenant_id: string
  aircraft_id: string
  amenity_id: string
  created_at: string
  amenity?: Amenity
}

export function useAmenities() {
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/amenities')
        
        if (!response.ok) {
          throw new Error('Failed to fetch amenities')
        }
        
        const { data } = await response.json()
        setAmenities(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching amenities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAmenities()
  }, [])

  return { amenities, loading, error }
}

export function useAircraftAmenities(aircraftId?: string) {
  const [aircraftAmenities, setAircraftAmenities] = useState<AircraftAmenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!aircraftId) {
      setAircraftAmenities([])
      setLoading(false)
      return
    }

    const fetchAircraftAmenities = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/aircraft/${aircraftId}/amenities`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch aircraft amenities')
        }
        
        const { data } = await response.json()
        setAircraftAmenities(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching aircraft amenities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAircraftAmenities()
  }, [aircraftId])

  return { aircraftAmenities, loading, error }
}
