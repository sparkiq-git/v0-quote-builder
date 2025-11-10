"use client"

import dynamic from "next/dynamic"

const PublicItineraryPage = dynamic(() => import("@/components/itineraries/public-itinerary-page"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      Preparing itinerary experience...
    </div>
  ),
})

export function PublicItineraryClientWrapper({ token }: { token: string }) {
  return <PublicItineraryPage token={token} />
}
