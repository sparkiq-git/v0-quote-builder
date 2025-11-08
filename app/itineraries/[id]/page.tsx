import ItineraryDetailPage from "@/components/itineraries/itinerary-detail-page"

export default function ItineraryRoute({ params }: { params: { id: string } }) {
  return <ItineraryDetailPage id={params.id} />
}
