"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getQuoteById } from "@/lib/supabase/queries/quotes"
import { QuoteEditor } from "@/components/quotes/QuoteEditor"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"

export default function QuoteEditPage() {
  const { id } = useParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const q = await getQuoteById(id as string)
        if (!q) throw new Error("Quote not found")
        setQuote(q)
      } catch (err: any) {
        toast({
          title: "Error loading quote",
          description: err.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchQuote()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading quote...
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Quote not found or deleted.
      </div>
    )
  }

  return (
    <div className="container py-8">
      <QuoteEditor
        quote={quote}
        quoteDetails={quote.legs || []}
        onQuoteChange={setQuote}
      />
    </div>
  )
}
