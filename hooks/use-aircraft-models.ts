"use client"

import { useState, useEffect } from "react"

export interface AircraftModelData {
  id: string
  name: string
  manufacturer: string
  manufacturerId: string
  icaoTypeDesignator?: string
  sizeCode?: string
  rangeNm?: number
  mtowKg?: number
  cruisingSpeed?: number
  capacityPax?: number
  notes?: string
  images: string[]
  isArchived?: boolean
  createdBy?: string
  createdAt: string
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
          const errorText = await response.text()
          console.error('API Error Response:', { status: response.status, errorText })
          throw new Error(`Failed to fetch aircraft models: ${response.status} ${errorText}`)
        }
        
        const responseData = await response.json()
        console.log('Raw API response:', responseData)
        
        const { data } = responseData
        
        console.log('Data from API:', { data, dataLength: data?.length })
        
        if (!data || data.length === 0) {
          console.log('No aircraft models found in database')
          setModels([])
          return
        }
        
        // Transform the data to match the expected format
        const transformedData = data.map((model: any) => ({
          id: model.id,
          name: model.name,
          manufacturer: model.aircraft_manufacturer?.name || 'Unknown',
          manufacturerId: model.manufacturer_id,
          icaoTypeDesignator: model.icao_type_designator,
          sizeCode: model.size_code,
          rangeNm: model.range_nm,
          mtowKg: model.mtow_kg,
          cruisingSpeed: model.cruising_speed,
          capacityPax: model.capacity_pax,
          notes: model.notes,
          images: model.aircraft_model_image
            ?.sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1
              if (!a.is_primary && b.is_primary) return 1
              return a.display_order - b.display_order
            })
            .map((img: any) => img.public_url)
            .filter(Boolean) || [],
          isArchived: false, // Public models don't have archived state
          createdBy: model.created_by,
          createdAt: model.created_at,
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