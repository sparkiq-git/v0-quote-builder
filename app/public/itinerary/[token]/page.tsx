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

export default function PublicItineraryRoute({ params }: { params: { token: string } }) {
  return <PublicItineraryPage token={params.token} />
}
