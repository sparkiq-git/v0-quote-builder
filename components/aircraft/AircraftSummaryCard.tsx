"use client"

import { Button } from "@/components/ui/button"
import { Plane } from "lucide-react"

export function AircraftSummaryCard({
  aircraft,
  onEdit,
}: {
  aircraft?: {
    tail_number?: string | null
    manufacturer_name?: string | null
    model_name?: string | null
    operator_name?: string | null
    primary_image_url?: string | null
    aircraft_images?: string[] // Add aircraft images array
    capacity_pax?: number | null
    cruising_speed?: number | null // add this if you have it in your view
    amenities?: string[]
  }
  onEdit?: () => void
}) {
  if (!aircraft) return null

  // Get the best available image (primary > first aircraft image > placeholder)
  const getThumbnailUrl = () => {
    if (aircraft.primary_image_url) return aircraft.primary_image_url
    if (aircraft.aircraft_images?.length) return aircraft.aircraft_images[0]
    return null
  }

  const thumbnailUrl = getThumbnailUrl()

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
      {/* Image */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={aircraft.tail_number || ""}
          className="w-20 h-16 rounded-md object-cover"
        />
      ) : (
        <div className="w-20 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
          <Plane className="h-6 w-6" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          {aircraft.tail_number
            ? `${aircraft.tail_number} – ${aircraft.manufacturer_name || ""} ${aircraft.model_name || ""}`
            : `${aircraft.manufacturer_name || ""} ${aircraft.model_name || ""}`}
        </div>

        {aircraft.operator_name && (
          <div className="text-sm text-muted-foreground truncate">
            Operated by <span className="text-foreground font-medium">{aircraft.operator_name}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
          {typeof aircraft.capacity_pax === "number" && <span>🪑 {aircraft.capacity_pax} pax</span>}
          {typeof aircraft.cruising_speed === "number" && <span>✈️ {aircraft.cruising_speed} kt</span>}
          {aircraft.amenities?.length ? (
            <span className="truncate">
              🧳 {aircraft.amenities.slice(0, 3).join(", ")}
              {aircraft.amenities.length > 3 ? "…" : ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* Edit */}
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  )
}
