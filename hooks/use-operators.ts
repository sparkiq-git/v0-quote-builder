"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export interface OperatorData {
  id: string
  name: string
  icao_code?: string
  iata_code?: string
}

export function useOperators() {
  const [operators, setOperators] = useState<OperatorData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
      const { data, error } = await supabase
          .from("operator")
          .select("id, name, icao_code, iata_code")
          .order("name")
        
        if (error) throw error
        
        setOperators(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching operators:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchOperators()
  }, [])

  return { operators, loading, error }
}
