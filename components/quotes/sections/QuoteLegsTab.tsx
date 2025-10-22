"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AirportCombobox } from "@/components/ui/airport-combobox"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Plane, ChevronRight, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Quote, Leg } from "@/lib/types"

type TripType = "one-way" | "round-trip" | "multi-city"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onLegsChange: (legs: any[]) => void
  onNext: () => void
  onBack: () => void
}

export function QuoteLegsTab({ quote, onUpdate, onLegsChange, onNext, onBack }: Props) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [tripType, setTripType] = useState<TripType>(quote.trip_type || "one-way")

  // ✅ Normalize incoming legs
  const legs = Array.isArray(quote.legs) ? quote.legs : []

  // ✅ Multi-leg state
  const [multiLegs, setMultiLegs] = useState<Leg[]>(
    legs.length
      ? legs.map((l) => ({
          id: l.id || crypto.randomUUID(),
          origin: l.origin || "",
          origin_code: l.origin_code || "",
          destination: l.destination || "",
          destination_code: l.destination_code || "",
          departureDate: l.departureDate || l.depart_dt || "",
          departureTime: l.departureTime || l.depart_time || "",
          passengers: l.passengers || l.pax_count || 1,
          origin_lat: l.origin_lat ?? null,
          origin_long: l.origin_long ?? null,
          destination_lat: l.destination_lat ?? null,
          destination_long: l.destination_long ?? null,
          distance_nm: l.distance_nm ?? null,
        }))
      : [
          {
            id: crypto.randomUUID(),
            origin: "",
            origin_code: "",
            destination: "",
            destination_code: "",
            departureDate: "",
            departureTime: "",
            passengers: 1,
            origin_lat: null,
            origin_long: null,
            destination_lat: null,
            destination_long: null,
            distance_nm: null,
          },
        ]
  )

  /* ------------------ 🧠 Helpers ------------------ */
  const buildTripSummary = (legs: Leg[]) => {
    const chain = legs
      .flatMap((l) => [l.origin_code || l.origin, l.destination_code || l.destination])
      .filter(Boolean)
      .reduce((acc: string[], curr, i, arr) => {
        if (i === 0 || curr !== arr[i - 1]) acc.push(curr)
        return acc
      }, [])
    return chain.join(" → ")
  }

  const syncQuoteState = (legsToSave: Leg[], type: TripType) => {
    const leg_count = legsToSave.length
    const total_pax = Math.max(...legsToSave.map((l) => l.passengers || 0))
    const trip_summary = buildTripSummary(legsToSave)
    onUpdate({ legs: legsToSave, trip_type: type, leg_count, total_pax, trip_summary })
    onLegsChange(legsToSave)
  }

  /* ------------------ ✈️ Save & Navigate ------------------ */
  const handleSaveAndNavigate = async (direction: "next" | "back") => {
    try {
      setSaving(true)

      const legsToSave = multiLegs.map((l) => ({
        ...l,
        passengers: l.passengers || 1,
      }))

      const payload = {
        quote: {
          contact_id: quote.contact_id,
          contact_name: quote.contact_name,
          contact_email: quote.contact_email,
          contact_phone: quote.contact_phone,
          contact_company: quote.contact_company,
          valid_until: quote.valid_until,
          notes: quote.notes,
          title: quote.title,
          status: quote.status,
        },
        legs: legsToSave,
      }

      console.log("🧩 Saving legs payload:", JSON.stringify(payload, null, 2))

      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save legs")

      toast({ title: "Legs saved", description: "Trip legs updated successfully." })
      if (direction === "next") onNext()
      else onBack()
    } catch (err: any) {
      toast({ title: "Error saving legs", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  /* ------------------ 🧱 Multi-leg Handlers ------------------ */
  const handleAddLeg = () => {
    const last = multiLegs[multiLegs.length - 1]
    const newLeg: Leg = {
      id: crypto.randomUUID(),
      origin: last?.destination || "",
      origin_code: last?.destination_code || "",
      destination: "",
      destination_code: "",
      departureDate: "",
      departureTime: "",
      passengers: last?.passengers || 1,
    }
    const updated = [...multiLegs, newLeg]
    setMultiLegs(updated)
    syncQuoteState(updated, tripType)
  }

  const handleRemoveLeg = (id: string) => {
    const updated = multiLegs.filter((l) => l.id !== id)
    setMultiLegs(updated)
    syncQuoteState(updated, tripType)
  }

  const handleUpdateLeg = (id: string, updates: Partial<Leg>) => {
    const updated = multiLegs.map((l) => (l.id === id ? { ...l, ...updates } : l))
    setMultiLegs(updated)
    syncQuoteState(updated, tripType)
  }

  /* ------------------ 🎨 Render ------------------ */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Trip Details
        </CardTitle>
        <CardDescription>Configure your itinerary and passenger info.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trip Type Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {(["one-way", "round-trip", "multi-city"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                tripType === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type === "one-way"
                ? "One-Way"
                : type === "round-trip"
                ? "Round-Trip"
                : "Multi-City"}
            </button>
          ))}
        </div>

        {/* Multi-City UI (kept same for all types now) */}
        <div className="space-y-4">
          {multiLegs.map((leg, i) => (
            <div key={leg.id} className="p-4 border rounded-lg space-y-4 bg-background/50">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Leg {i + 1}</div>
                {multiLegs.length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => handleRemoveLeg(leg.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Origin */}
                <div className="grid gap-2 lg:col-span-2">
                  <Label>Origin *</Label>
                  <AirportCombobox
                    value={leg.origin_code}
                    onSelect={(a) =>
                      handleUpdateLeg(leg.id, {
                        origin: a.airport,
                        origin_code: a.airport_code,
                        origin_lat: a.latitude ?? null,
                        origin_long: a.longitude ?? null,
                      })
                    }
                  />
                </div>

                {/* Destination */}
                <div className="grid gap-2 lg:col-span-2">
                  <Label>Destination *</Label>
                  <AirportCombobox
                    value={leg.destination_code}
                    onSelect={(a) =>
                      handleUpdateLeg(leg.id, {
                        destination: a.airport,
                        destination_code: a.airport_code,
                        destination_lat: a.latitude ?? null,
                        destination_long: a.longitude ?? null,
                      })
                    }
                  />
                </div>

                {/* Departure Date */}
                <div>
                  <Label>Departure Date *</Label>
                  <DateTimePicker
                    date={leg.departureDate}
                    onDateChange={(d) => handleUpdateLeg(leg.id, { departureDate: d })}
                    showOnlyDate
                  />
                </div>

                {/* Departure Time */}
                <div>
                  <Label>Departure Time</Label>
                  <DateTimePicker
                    time={leg.departureTime}
                    onTimeChange={(t) => handleUpdateLeg(leg.id, { departureTime: t })}
                    showOnlyTime
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Passengers *</Label>
                  <input
                    type="number"
                    min={1}
                    value={leg.passengers}
                    onChange={(e) =>
                      handleUpdateLeg(leg.id, {
                        passengers: parseInt(e.target.value) || 1,
                      })
                    }
                    className="border rounded-md px-3 py-2 bg-background"
                  />
                </div>
              </div>
            </div>
          ))}

          {multiLegs.length < 6 && (
            <Button variant="outline" className="w-full" onClick={handleAddLeg}>
              <Plus className="mr-2 h-4 w-4" /> Add Leg
            </Button>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => handleSaveAndNavigate("back")} disabled={saving}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Details
          </Button>
          <Button onClick={() => handleSaveAndNavigate("next")} disabled={saving}>
            {saving ? "Saving..." : "Next: Aircraft Options"}{" "}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
