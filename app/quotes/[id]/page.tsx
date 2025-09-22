"use client"

import { notFound, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { QuoteBuilderTabs } from "@/components/quotes/quote-builder-tabs"
import { useMockStore } from "@/lib/mock/store"
import type { Quote } from "@/lib/types"

interface QuoteDetailPageProps {
  params: {
    id: string
  }
}

export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { getQuoteById, dispatch } = useMockStore()
  const router = useRouter()

  const quote = getQuoteById(params.id)

  if (!quote) {
    notFound()
  }

  const handleUpdateQuote = (updates: Partial<Quote>) => {
    dispatch({
      type: "UPDATE_QUOTE",
      payload: { id: params.id, updates },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote Builder</h1>
          <p className="text-muted-foreground">Configure and publish quote for {quote.customer.name}</p>
        </div>
      </div>

      <QuoteBuilderTabs quote={quote} onUpdate={handleUpdateQuote} />
    </div>
  )
}
