import { Badge } from "@/components/ui/badge"

interface ItineraryStatusBadgeProps {
  status: string
}

export function ItineraryStatusBadge({ status }: ItineraryStatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case "completed":
        return "default"
      case "trip_confirmed":
      case "in_progress":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  return <Badge variant={getVariant()}>{status.replace("_", " ")}</Badge>
}
