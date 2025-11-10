import { PublicItineraryClientWrapper } from "./client-wrapper"

export default function PublicItineraryRoute({ params }: { params: { token: string } }) {
  return <PublicItineraryClientWrapper token={params.token} />
}
