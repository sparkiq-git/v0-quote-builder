"use client"

import { useEffect, useState, useCallback } from "react"
import { saveQuoteAll, deleteQuote } from "@/lib/supabase/queries/quotes"
import { QuoteBuilderTabs } from "@/components/quotes/QuoteBuilderTabs"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { Pencil , Check} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface QuoteEditorProps {
  quote: any
  quoteDetails?: any[]
  onQuoteChange?: (quote: any) => void
  onQuoteDetailsChange?: (legs: any[]) => void
}

export function QuoteEditor({
  quote: initialQuote,
  quoteDetails: initialQuoteDetails = [],
  onQuoteChange,
  onQuoteDetailsChange,
}: QuoteEditorProps) {
  const { toast } = useToast()
  const [quote, setQuote] = useState(initialQuote)
  const [quoteDetails, setQuoteDetails] = useState(initialQuoteDetails)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [localUpdates, setLocalUpdates] = useState<Partial<any> | null>(null)
  const [localLegUpdates, setLocalLegUpdates] = useState<any[] | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
const [tempTitle, setTempTitle] = useState(quote.title || "New Quote")

  /* -------------------- SYNC INITIAL PROPS -------------------- */
  useEffect(() => {
    if (!pendingChanges && initialQuote?.id && initialQuote.id !== quote?.id) {
      setQuote(initialQuote)
    }
  }, [initialQuote?.id])

  useEffect(() => {
    if (!pendingChanges && Array.isArray(initialQuoteDetails)) {
      setQuoteDetails(initialQuoteDetails)
    }
  }, [initialQuoteDetails])

  /* -------------------- LOCAL UPDATE HANDLERS -------------------- */
  const handleUpdate = useCallback(
    (updates: Partial<any>) => {
      if (saving) return
      setQuote((prev) => ({ ...prev, ...updates }))
      setLocalUpdates((prev) => ({ ...(prev || {}), ...updates }))
      setPendingChanges(true)
    },
    [saving],
  )

  const handleUpdateLegs = useCallback((newLegs: any[]) => {
    setQuoteDetails(newLegs)
    setLocalLegUpdates(newLegs)
    setPendingChanges(true)
  }, [])

  /* -------------------- PROPAGATE UPDATES TO PARENT -------------------- */
  useEffect(() => {
    if (localUpdates && onQuoteChange) {
      onQuoteChange({ ...quote, ...localUpdates })
      setLocalUpdates(null)
    }
  }, [localUpdates, quote, onQuoteChange])

  useEffect(() => {
    if (localLegUpdates && onQuoteDetailsChange) {
      onQuoteDetailsChange(localLegUpdates)
      setLocalLegUpdates(null)
    }
  }, [localLegUpdates, onQuoteDetailsChange])

/* -------------------- NORMALIZE LEGS -------------------- */
const normalizeLegs = useCallback((legs: any[]) => {
  return (legs || []).map((l) => ({
    origin: l.origin?.airport || l.origin || null,
    origin_code: l.origin?.airport_code || l.origin_code || null,
    destination: l.destination?.airport || l.destination || null,
    destination_code: l.destination?.airport_code || l.destination_code || null,
    departureDate: l.departureDate || l.depart_dt || null,
    departureTime: l.departureTime || l.depart_time || null,
    passengers: l.passengers || l.pax_count || 0,
      origin_lat:
      l.origin_lat ??
      l.origin?.latitude ??
      l.origin?.lat ??
      null,
    origin_long:
      l.origin_long ??
      l.origin?.longitude ??
      l.origin?.lon ??
      null,
    destination_lat:
      l.destination_lat ??
      l.destination?.latitude ??
      l.destination?.lat ??
      null,
    destination_long:
      l.destination_long ??
      l.destination?.longitude ??
      l.destination?.lon ??
      null,
    distance_nm: l.distance_nm ?? null,
  }))
}, [])


  /* -------------------- WARN BEFORE EXIT -------------------- */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [pendingChanges])

  /* -------------------- DELETE HANDLER -------------------- */
  const handleDelete = async () => {
    try {
      if (!quote?.id) return
      await deleteQuote(quote.id)
      toast({ title: "Quote deleted", description: "The quote was successfully deleted." })
      setShowDeleteModal(false)
      window.location.href = "/quotes"
    } catch (err: any) {
      console.error("❌ Delete failed:", err)
      toast({
        title: "Failed to delete quote",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  /* -------------------- RENDER -------------------- */
  if (!quote) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Loading quote...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
  <div className="flex flex-col">
    {/* Title + Pencil */}
    <div className="flex items-center gap-2 group">
      {editingTitle ? (
        <input
          type="text"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onBlur={() => {
            setEditingTitle(false)
            handleUpdate({ title: tempTitle.trim() || "New Quote" })
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            } else if (e.key === "Escape") {
              setTempTitle(quote.title || "New Quote")
              setEditingTitle(false)
            }
          }}
          className="text-2xl font-semibold tracking-tight bg-transparent border-b border-primary focus:outline-none focus:ring-0 w-full max-w-md"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setEditingTitle(true)}
          className="flex items-center gap-2 text-2xl font-semibold tracking-tight hover:text-primary transition-colors"
        >
          {quote.title || "New Quote"}
          <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      )}
    </div>

    <p className="text-sm text-muted-foreground mt-1">
      {saving
        ? "Saving..."
        : pendingChanges
        ? "Unsaved changes"
        : lastSaved
        ? `Last saved at ${lastSaved.toLocaleTimeString()}`
        : "All changes saved"}
    </p>
  </div>

  <div className="flex items-center gap-2">
    <Button variant="outline" onClick={() => setShowDeleteModal(true)}>
      <Trash2 className="h-4 w-4 mr-2" /> Delete
    </Button>
  </div>
</div>

      {/* Tabs */}
      <QuoteBuilderTabs
        quote={{
          ...quote,
          legs: Array.isArray(quoteDetails) ? quoteDetails : [],
          options: Array.isArray(quote.options) ? quote.options : [],
          services: Array.isArray(quote.services) ? quote.services : [],
          customer: {
            id: quote.contact_id || "",
            name: quote.contact_name || "",
            email: quote.contact_email || "",
            phone: quote.contact_phone || "",
            company: quote.contact_company || "",
          },
        }}
        onUpdate={handleUpdate}
        onLegsChange={handleUpdateLegs}
        onNavigate={async () => {
          // Save any pending changes before navigation
          if (pendingChanges) {
            try {
              // Prepare the complete quote object with all data
              const completeQuote = {
                ...quote,
                ...localUpdates,
                legs: Array.isArray(quoteDetails) ? quoteDetails : [],
                options: Array.isArray(quote.options) ? quote.options : [],
                services: Array.isArray(quote.services) ? quote.services : [],
              }
              
              console.log("💾 Saving complete quote before navigation:", {
                quoteId: completeQuote.id,
                legs: completeQuote.legs?.length || 0,
                options: completeQuote.options?.length || 0,
                services: completeQuote.services?.length || 0,
              })
              
              await saveQuoteAll(completeQuote)
              setPendingChanges(false)
              setLastSaved(new Date())
            } catch (error) {
              console.error("Failed to save before navigation:", error)
              throw error
            }
          }
        }}
      />

      {/* Delete Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This quote and all related details will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
