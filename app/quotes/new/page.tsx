"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createQuote } from "@/lib/supabase/queries/quotes"
import { QuoteEditor } from "@/components/quotes/QuoteEditor"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function NewQuotePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [quote, setQuote] = useState<any | null>(null)
  const [quoteDetails, setQuoteDetails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  /* -------------------- INITIALIZE NEW QUOTE -------------------- */
  useEffect(() => {
    const initNewQuote = async () => {
      try {
        setLoading(true)
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID
        if (!tenantId) throw new Error("Missing NEXT_PUBLIC_TENANT_ID")

        console.log("🟡 Creating new quote for tenant:", tenantId)

        const data = await createQuote(tenantId)

        if (!data?.id) throw new Error("Quote creation failed")

        setQuote(data)
        setQuoteDetails([])

        toast({
          title: "New quote created",
          description: "You can now begin editing your quote.",
        })
      } catch (err: any) {
        console.error("❌ Error creating new quote:", err)
        toast({
          title: "Failed to create quote",
          description: err.message || "Could not create quote in Supabase.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    initNewQuote()
  }, [toast])

  /* -------------------- RENDER -------------------- */
  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Initializing new quote...</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to create quote. Please try again.
      </div>
    )
  }

  return (
    <QuoteEditor
      quote={quote}
      quoteDetails={quoteDetails}
      onQuoteChange={(updated) => setQuote(updated)}
      onQuoteDetailsChange={(legs) => setQuoteDetails(legs)}
    />
  )
}
