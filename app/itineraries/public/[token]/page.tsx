import PublicItineraryPage from "@/components/itineraries/public-itinerary-page"

export default function ItineraryPublicRoute({ params }: { params: { token: string } }) {
  return <PublicItineraryPage token={params.token} />
}
