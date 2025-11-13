"use client"

import { useState, useEffect, useCallback } from "react"

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

  const fetchOperators = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/operators')
      
      if (!response.ok) {
        throw new Error('Failed to fetch operators')
      }
      
      const { data } = await response.json()
      setOperators(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching operators:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOperators()
  }, [fetchOperators])

  const createOperator = useCallback(async (operatorData: { name: string; icao_code?: string | null; iata_code?: string | null }) => {
    try {
      const response = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operatorData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create operator')
      }

      const { data } = await response.json()
      
      // Refresh operators list
      await fetchOperators()
      
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create operator'
      console.error('Error creating operator:', err)
      return { success: false, error: errorMessage }
    }
  }, [fetchOperators])

  return { operators, loading, error, refetch: fetchOperators, createOperator }
}
