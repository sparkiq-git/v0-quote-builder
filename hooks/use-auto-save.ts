import { useCallback, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

interface UseAutoSaveOptions {
  delay?: number // Delay in milliseconds before saving
  maxRetries?: number // Maximum number of retry attempts
  onSave?: (data: any) => Promise<void> // Save function
  onError?: (error: Error) => void // Error handler
  enabled?: boolean // Whether auto-save is enabled
}

export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions = {}
) {
  const {
    delay = 30000, // 30 seconds default
    maxRetries = 3,
    onSave,
    onError,
    enabled = true,
  } = options

  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)
  const lastSavedDataRef = useRef<T>()
  const isSavingRef = useRef(false)

  // Debounced save function
  const debouncedSave = useCallback(async (dataToSave: T) => {
    if (!enabled || !onSave || isSavingRef.current) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true
        retryCountRef.current = 0

        await onSave(dataToSave)
        lastSavedDataRef.current = dataToSave

        // Show success toast only in development or if explicitly requested
        if (process.env.NODE_ENV === "development") {
          toast({
            title: "Auto-saved",
            description: "Your changes have been automatically saved.",
            duration: 2000,
          })
        }
      } catch (error) {
        console.error("Auto-save failed:", error)
        
        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          console.log(`Retrying auto-save (${retryCountRef.current}/${maxRetries})`)
          
          // Exponential backoff
          const retryDelay = delay * Math.pow(2, retryCountRef.current - 1)
          setTimeout(() => debouncedSave(dataToSave), retryDelay)
        } else {
          // Max retries reached
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          
          toast({
            title: "Auto-save failed",
            description: `Failed to save changes: ${errorMessage}`,
            variant: "destructive",
            duration: 5000,
          })

          if (onError) {
            onError(error instanceof Error ? error : new Error(errorMessage))
          }
        }
      } finally {
        isSavingRef.current = false
      }
    }, delay)
  }, [delay, maxRetries, onSave, onError, enabled, toast])

  // Check if data has changed
  const hasDataChanged = useCallback((newData: T) => {
    if (!lastSavedDataRef.current) return true
    return JSON.stringify(newData) !== JSON.stringify(lastSavedDataRef.current)
  }, [])

  // Effect to trigger auto-save when data changes
  useEffect(() => {
    if (!enabled || !onSave || !hasDataChanged(data)) return

    debouncedSave(data)

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, enabled, onSave, debouncedSave, hasDataChanged])

  // Manual save function
  const saveNow = useCallback(async () => {
    if (!onSave || isSavingRef.current) return

    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    try {
      isSavingRef.current = true
      await onSave(data)
      lastSavedDataRef.current = data
      
      toast({
        title: "Saved",
        description: "Your changes have been saved.",
        duration: 2000,
      })
    } catch (error) {
      console.error("Manual save failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      toast({
        title: "Save failed",
        description: `Failed to save changes: ${errorMessage}`,
        variant: "destructive",
        duration: 5000,
      })

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }
    } finally {
      isSavingRef.current = false
    }
  }, [data, onSave, onError, toast])

  // Force save function (bypasses debouncing)
  const forceSave = useCallback(async () => {
    if (!onSave || isSavingRef.current) return

    try {
      isSavingRef.current = true
      await onSave(data)
      lastSavedDataRef.current = data
    } catch (error) {
      console.error("Force save failed:", error)
      throw error
    } finally {
      isSavingRef.current = false
    }
  }, [data, onSave])

  return {
    saveNow,
    forceSave,
    isSaving: isSavingRef.current,
    hasUnsavedChanges: hasDataChanged(data),
  }
}
