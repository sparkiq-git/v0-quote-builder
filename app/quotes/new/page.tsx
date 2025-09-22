"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { QuoteBuilderTabs } from "@/components/quotes/quote-builder-tabs"
import { useMockStore } from "@/lib/mock/store"
import type { Quote } from "@/lib/types"
import { useEffect, useState } from "react"

export default function NewQuotePage() {
  const { dispatch } = useMockStore()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)

  useEffect(() => {
    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      customerId: `customer-${Date.now()}`,
      customer: {
        id: `customer-${Date.now()}`,
        name: "",
        email: "",
        phone: "",
      },
      legs: [
        {
          id: `leg-${Date.now()}`,
          origin: "",
          destination: "",
          departureDate: "",
          departureTime: "",
          passengers: 1,
        },
      ],
      options: [],
      services: [],
      status: "pending_acceptance",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      terms: "Standard terms and conditions apply.",
      branding: {
        primaryColor: "#2563eb",
      },
    }

    // Add the quote to the store
    dispatch({
      type: "ADD_QUOTE",
      payload: newQuote,
    })

    setQuote(newQuote)
  }, [dispatch])

  const handleUpdateQuote = (updates: Partial<Quote>) => {
    if (!quote) return

    dispatch({
      type: "UPDATE_QUOTE",
      payload: { id: quote.id, updates },
    })

    // Update local state to reflect changes
    setQuote((prev) => (prev ? { ...prev, ...updates } : null))
  }

  if (!quote) {
    return <div>Loading...</div>
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
