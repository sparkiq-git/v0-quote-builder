"use client"

import { useState, useEffect } from "react"

export interface AircraftData {
  id: string
  tailNumber: string
  modelId: string
  operator?: string
  year?: number
  status: string
  homeBase?: string
  capacityPax?: number
  serialNumber?: string
  rangeNm?: number
  mtowKg?: number
  notes?: string
  amenities?: string
  images: string[]
  aircraftModel?: {
    id: string
    name: string
    manufacturer: string
    defaultCapacity?: number
    defaultRangeNm?: number
    defaultSpeedKnots?: number
    images: string[]
  }
  createdAt: string
  updatedAt: string
}

export function useAircraft() {
  const [aircraft, setAircraft] = useState<AircraftData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAircraft = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/aircraft')
      
      if (!response.ok) {
        throw new Error('Failed to fetch aircraft data')
      }
      
      const { data } = await response.json()
      
      // Transform the data to match the expected format
      const transformedData = data.map((aircraft: any) => ({
        id: aircraft.id,
        tailNumber: aircraft.tail_number,
        modelId: aircraft.model_id,
        operator: aircraft.operator?.name || null,
        operatorId: aircraft.operator_id,
        year: aircraft.year_of_manufacture,
        yearOfRefurbish: aircraft.year_of_refurbish,
        status: aircraft.status,
        homeBase: aircraft.home_base,
        capacityPax: aircraft.capacity_pax,
        serialNumber: aircraft.serial_number,
        rangeNm: aircraft.range_nm,
        mtowKg: aircraft.mtow_kg,
        cruisingSpeed: aircraft.cruising_speed,
        notes: aircraft.notes,
        amenities: aircraft.notes || '',
        images: aircraft.aircraft_image
          ?.sort((a: any, b: any) => {
            if (a.is_primary && !b.is_primary) return -1
            if (!a.is_primary && b.is_primary) return 1
            return a.display_order - b.display_order
          })
          .map((img: any) => img.public_url)
          .filter(Boolean) || [],
        aircraftModel: aircraft.aircraft_model ? {
          id: aircraft.aircraft_model.id,
          name: aircraft.aircraft_model.name,
          manufacturer: aircraft.aircraft_model.aircraft_manufacturer?.name || 'Unknown',
          defaultCapacity: aircraft.aircraft_model.size_code ? parseInt(aircraft.aircraft_model.size_code) : 8,
          defaultRangeNm: 2000, // Default range
          defaultSpeedKnots: 400, // Default speed
          images: aircraft.aircraft_model.aircraft_model_image
            ?.sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1
              if (!a.is_primary && b.is_primary) return 1
              return a.display_order - b.display_order
            })
            .map((img: any) => img.public_url)
            .filter(Boolean) || [],
        } : null,
        createdAt: aircraft.created_at,
        updatedAt: aircraft.updated_at,
      }))
      
      setAircraft(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching aircraft data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAircraft()
  }, [])

  return { aircraft, loading, error, refetch: fetchAircraft }
}
