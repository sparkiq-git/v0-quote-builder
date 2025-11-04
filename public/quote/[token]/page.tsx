// app/public/quote/[token]/page.tsx
"use client"

import PublicQuotePage from "@/components/quotes/public-quote-page"

export default function PublicQuoteRoute({ params }: { params: { token: string } }) {
  return <PublicQuotePage params={params} />
}
