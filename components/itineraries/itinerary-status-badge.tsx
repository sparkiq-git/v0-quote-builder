import { Badge } from "@/components/ui/badge"

interface ItineraryStatusBadgeProps {
  status: string
}

export function ItineraryStatusBadge({ status }: ItineraryStatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "trip_confirmed":
        return "default"
      case "in_progress":
        return "default"
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft"
      case "trip_confirmed":
        return "Trip Confirmed"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      default:
        return status
    }
  }

  return <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
}
