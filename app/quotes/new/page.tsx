"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { QuoteBuilderTabs } from "@/components/quotes/quote-builder-tabs"
import { useMockStore } from "@/lib/mock/store"
import type { Quote } from "@/lib/types"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { createQuote, updateQuote, upsertQuoteDetails } from "@/lib/supabase/queries/quotes"

/* ============================================================
   Debounce Hook
============================================================ */
function useDebounceEffect(effect: () => void, deps: any[], delay: number) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay])
}

/* ============================================================
   New Quote Page
============================================================ */
export default function NewQuotePage() {
  const { dispatch } = useMockStore()
  const router = useRouter()
  const { toast } = useToast()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Quote> | null>(null)
  const [loading, setLoading] = useState(true)

  /* -------------------- INIT QUOTE -------------------- */
  useEffect(() => {
    async function initQuote() {
      try {
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        if (!tenantId) throw new Error("Missing tenant ID")

        const data = await createQuote(tenantId)

        const newQuote: Quote = {
          id: data.id,
          customerId: data.contact_id || "",
          customer: {
            id: data.contact_id || "",
            name: data.contact_name || "",
            email: data.contact_email || "",
            phone: data.contact_phone || "",
            company: data.contact_company || "",
          },
          legs: [],
          options: [],
          services: [],
          status: data.status,
          expiresAt: data.valid_until,
          createdAt: data.created_at,
          notes: data.notes || "",
          terms: "Standard terms and conditions apply.",
          branding: {
            primaryColor: "#2563eb",
          },
        }

        dispatch({ type: "ADD_QUOTE", payload: newQuote })
        setQuote(newQuote)
      } catch (err: any) {
        console.error("❌ Error creating quote:", err)
        toast({
          title: "Error creating quote",
          description: err.message || "Failed to initialize new quote.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    initQuote()
  }, [dispatch, toast])

  /* -------------------- HANDLE LOCAL UPDATE -------------------- */
  const handleUpdateQuote = (updates: Partial<Quote>) => {
    if (!quote) return
    setQuote((prev) => (prev ? { ...prev, ...updates } : null))
    dispatch({ type: "UPDATE_QUOTE", payload: { id: quote.id, updates } })
    setPendingUpdates((prev) => ({ ...(prev || {}), ...updates }))
  }

  /* -------------------- DEBOUNCED AUTOSAVE -------------------- */
  useDebounceEffect(() => {
    if (!quote || !pendingUpdates) return

    const saveToSupabase = async () => {
      try {
        const dbUpdates: Record<string, any> = {}

        // Map all quote fields
        if (pendingUpdates.customer) {
          dbUpdates.contact_name = pendingUpdates.customer.name
          dbUpdates.contact_email = pendingUpdates.customer.email
          dbUpdates.contact_phone = pendingUpdates.customer.phone
          dbUpdates.contact_company = pendingUpdates.customer.company
        }

        if (pendingUpdates.expiresAt) dbUpdates.valid_until = pendingUpdates.expiresAt
        if (pendingUpdates.status) dbUpdates.status = pendingUpdates.status
        if (pendingUpdates.title) dbUpdates.title = pendingUpdates.title
        if (pendingUpdates.notes) dbUpdates.notes = pendingUpdates.notes
        if (pendingUpdates.tripType) dbUpdates.trip_type = pendingUpdates.tripType
        if (pendingUpdates.tripSummary) dbUpdates.trip_summary = pendingUpdates.tripSummary
        if (pendingUpdates.totalPax) dbUpdates.total_pax = pendingUpdates.totalPax
        if (pendingUpdates.specialNotes) dbUpdates.special_notes = pendingUpdates.specialNotes

        // ✏️ Write quote header
        if (Object.keys(dbUpdates).length > 0) {
          await updateQuote(quote.id, dbUpdates)
          console.log("💾 Quote updated in DB:", dbUpdates)
        }

        // 🛫 Write trip legs (quote_detail)
        if (pendingUpdates.legs && pendingUpdates.legs.length > 0) {
          await upsertQuoteDetails(quote.id, pendingUpdates.legs)
          console.log("✈️ Legs upserted:", pendingUpdates.legs.length)
        }

        setPendingUpdates(null)
      } catch (err: any) {
        console.error("Failed to autosave:", err)
        toast({
          title: "Autosave failed",
          description: err.message,
          variant: "destructive",
        })
      }
    }

    saveToSupabase()
  }, [pendingUpdates], 1000)

  /* -------------------- RENDER -------------------- */
  if (loading || !quote) {
    return <div className="p-8 text-center text-muted-foreground">Loading quote...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Quote</h1>
          <p className="text-muted-foreground">Configure and publish a new charter quote</p>
        </div>
      </div>

      <QuoteBuilderTabs quote={quote} onUpdate={handleUpdateQuote} />
    </div>
  )
}
