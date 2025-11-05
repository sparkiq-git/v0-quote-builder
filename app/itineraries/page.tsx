export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

import { Suspense } from "react"
import { getServerUser } from "@/lib/supabase/server"
import { ItinerariesListClient } from "@/components/itineraries/itineraries-list-client"
import { ItinerariesPageLayout } from "@/components/itineraries/itineraries-page-layout"

export default async function ItinerariesPage() {
  try {
    const { user } = await getServerUser()

    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
            <p className="text-muted-foreground">
              Unable to verify your authentication. Please try refreshing the page.
            </p>
          </div>
        </div>
      )
    }

    return (
      <ItinerariesPageLayout>
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<div>Loading itineraries...</div>}>
            <ItinerariesListClient />
          </Suspense>
        </main>
      </ItinerariesPageLayout>
    )
  } catch (error) {
    console.error("Itineraries page error:", error)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Page</h1>
          <p className="text-muted-foreground">
            There was an error loading the itineraries page. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    )
  }
}
