"use client"

import { Button } from "@/components/ui/button"

export function AircraftSummaryCard({
  aircraft,
  onEdit,
}: {
  aircraft?: {
    primary_image_url?: string | null
    tail_number?: string | null
    model_name?: string | null
    manufacturer_name?: string | null
    operator_name?: string | null
    capacity_pax?: number | null
    range_nm?: number | null
    amenities?: string[]
  }
  onEdit?: () => void
}) {
  if (!aircraft) return null
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      {aircraft.primary_image_url ? (
        <img src={aircraft.primary_image_url} className="w-24 h-16 rounded object-cover" alt="" />
      ) : (
        <div className="w-24 h-16 rounded bg-muted flex items-center justify-center text-xs">No Img</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{aircraft.model_name}</div>
        <div className="text-sm text-muted-foreground truncate">
          {aircraft.manufacturer_name} · {aircraft.operator_name || "No Operator"}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
          {typeof aircraft.capacity_pax === "number" && <span>🪑 {aircraft.capacity_pax} pax</span>}
          {typeof aircraft.range_nm === "number" && <span>🛫 {aircraft.range_nm} nm</span>}
        </div>
        {aircraft.amenities?.length ? (
          <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
            {aircraft.amenities.join(", ")}
          </div>
        ) : null}
      </div>
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  )
}
