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
import type { Quote, Leg } from "@/lib/types"

type TripType = "one-way" | "round-trip" | "multi-city"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onLegsChange: (legs: any[]) => void // ✅ add this
  onNext: () => void
  onBack: () => void
}


export function QuoteLegsTab({ quote, onUpdate, onLegsChange, onNext, onBack }: Props)
 {
  const [tripType, setTripType] = useState<TripType>(quote.trip_type || "one-way")

  // Normalize incoming legs
  const legs = Array.isArray(quote.legs) ? quote.legs : []

  // One-way / Round-trip form state
  const [formState, setFormState] = useState({
    origin: legs[0]?.origin || "",
    origin_code: legs[0]?.origin_code || "",
    destination: legs[0]?.destination || "",
    destination_code: legs[0]?.destination_code || "",
    departureDate: legs[0]?.departureDate || legs[0]?.depart_dt || "",
    departureTime: legs[0]?.departureTime || legs[0]?.depart_time || "",
    returnDate: legs[1]?.departureDate || legs[1]?.depart_dt || "",
    returnTime: legs[1]?.departureTime || legs[1]?.depart_time || "",
    passengers: legs[0]?.passengers || legs[0]?.pax_count || 1,
  })

  // Multi-city
  const [multiLegs, setMultiLegs] = useState<Leg[]>(
    legs.length > 0
      ? legs.map((l) => ({
          id: l.id || crypto.randomUUID(),
          origin: l.origin || "",
          origin_code: l.origin_code || "",
          destination: l.destination || "",
          destination_code: l.destination_code || "",
          departureDate: l.departureDate || l.depart_dt || "",
          departureTime: l.departureTime || l.depart_time || "",
          passengers: l.passengers || l.pax_count || 1,
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
          },
        ]
  )

  /* ---------------------- Helpers ---------------------- */
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

  const syncQuote = (override?: Partial<typeof formState>, newTripType?: TripType,overrideMultiLegs?: Leg[]) => {
    const f = { ...formState, ...override }
    const type = newTripType || tripType
    let legsToSave: Leg[] = []

    if (type === "one-way") {
      legsToSave = [
        {
          id: legs[0]?.id || crypto.randomUUID(),
          origin: f.origin,
          origin_code: f.origin_code,
          destination: f.destination,
          destination_code: f.destination_code,
          departureDate: f.departureDate,
          departureTime: f.departureTime, // ✅ include time
          passengers: f.passengers,
      origin_lat: f.origin_lat ?? null,
      origin_long: f.origin_long ?? null,
      destination_lat: f.destination_lat ?? null,
      destination_long: f.destination_long ?? null,
        },
      ]
    }

    if (type === "round-trip") {
      legsToSave = [
        {
          id: legs[0]?.id || crypto.randomUUID(),
          origin: f.origin,
          origin_code: f.origin_code,
          destination: f.destination,
          destination_code: f.destination_code,
          departureDate: f.departureDate,
          departureTime: f.departureTime, // ✅ include time
          passengers: f.passengers,
        },
        {
          id: legs[1]?.id || crypto.randomUUID(),
          origin: f.destination,
          origin_code: f.destination_code,
          destination: f.origin,
          destination_code: f.origin_code,
          departureDate: f.returnDate,
          departureTime: f.returnTime, // ✅ include time
          passengers: f.passengers,
        },
      ]
    }

  if (type === "multi-city") {
    legsToSave = (overrideMultiLegs || multiLegs).map((l) => ({
      ...l,
      passengers: l.passengers || 1,
    })) // ✅ now uses latest updated multiLegs
  }

    const leg_count = legsToSave.length
    const total_pax =
      type === "multi-city"
        ? Math.max(...legsToSave.map((l) => l.passengers || 0))
        : f.passengers
    const trip_summary = buildTripSummary(legsToSave)

onUpdate({
  legs: legsToSave,
  trip_type: type,
  leg_count,
  total_pax,
  trip_summary,
})
onLegsChange?.(legsToSave)

  }

  /* ---------------------- Multi-city handlers ---------------------- */
  const handleAddLeg = () => {
    const last = multiLegs[multiLegs.length - 1]
    const newLeg: Leg = {
      id: crypto.randomUUID(),
      origin: last?.destination || "",
      origin_code: last?.destination_code || "",
      destination: "",
      destination_code: "",
      departureDate: "",
      departureTime: "", // ✅ present in UI & state
      passengers: last?.passengers || 1,
    }
    const updated = [...multiLegs, newLeg]
    setMultiLegs(updated)
    syncQuote()
  }

 const handleRemoveLeg = (id: string) => {
  const updated = multiLegs.filter((l) => l.id !== id)
  setMultiLegs(updated)
  syncQuote(undefined, tripType, updated) // ✅ pass updated list explicitly
}


const handleUpdateMultiLeg = (id: string, updates: Partial<Leg>) => {
  const updated = multiLegs.map((l) => (l.id === id ? { ...l, ...updates } : l))
  setMultiLegs(updated)
  syncQuote(undefined, tripType, updated) // ✅ pass updated directly
}


  /* ---------------------- Effects ---------------------- */
  useEffect(() => {
    syncQuote(undefined, tripType)
  }, [tripType])

  /* ---------------------- Validation ---------------------- */
  const isValid =
    tripType === "multi-city"
      ? multiLegs.every(
          (l) => l.origin_code && l.destination_code && l.departureDate && l.departureTime && l.passengers > 0
        )
      : formState.origin_code &&
        formState.destination_code &&
        formState.departureDate &&
        formState.departureTime &&
        formState.passengers > 0 &&
        (tripType === "one-way" || formState.returnDate)

  /* ---------------------- Render ---------------------- */
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Trip Details
            </CardTitle>
            <CardDescription>
              Configure your itinerary and passenger info.
            </CardDescription>
          </div>

          {/* Trip Type Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {(["one-way", "round-trip", "multi-city"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setTripType(type)
                  syncQuote(undefined, type)
                }}
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
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* One-way / Round-trip */}
        {(tripType === "one-way" || tripType === "round-trip") && (
          <div className="space-y-4 p-4 border rounded-lg bg-background/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Origin */}
              <div className="grid gap-2 lg:col-span-2">
                <Label>Origin *</Label>
                <AirportCombobox
                  value={formState.origin_code}
                  onSelect={(a) => {
                    const update = { origin: a.airport, origin_code: a.airport_code }
                    setFormState((prev) => ({ ...prev, ...update }))
                    syncQuote(update)
                  }}
                />
              </div>

              {/* Destination */}
              <div className="grid gap-2 lg:col-span-2">
                <Label>Destination *</Label>
                <AirportCombobox
                  value={formState.destination_code}
                  onSelect={(a) => {
                    const update = { destination: a.airport, destination_code: a.airport_code }
                    setFormState((prev) => ({ ...prev, ...update }))
                    syncQuote(update)
                  }}
                />
              </div>

              {/* Departure Date */}
              <div>
                <Label>Departure Date *</Label>
                <DateTimePicker
                  date={formState.departureDate}
                  onDateChange={(d) => {
                    const update = { departureDate: d }
                    setFormState((prev) => ({ ...prev, ...update }))
                    syncQuote(update)
                  }}
                  showOnlyDate
                />
              </div>

{/* Departure Time */}
<div>
  <Label>Departure Time</Label>
  <DateTimePicker
    time={formState.departureTime}
    onTimeChange={(t) => {
      console.log("🕒 picked time:", t) // 👈 add this line
      const update = { departureTime: t }
      setFormState((prev) => ({ ...prev, ...update }))
      syncQuote(update)
    }}
    showOnlyTime
  />
</div>

            </div>

            {/* Return fields */}
            {tripType === "round-trip" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <Label>Return Date *</Label>
                  <DateTimePicker
                    date={formState.returnDate}
                    onDateChange={(d) => {
                      const update = { returnDate: d }
                      setFormState((prev) => ({ ...prev, ...update }))
                      syncQuote(update)
                    }}
                    showOnlyDate
                  />
                </div>

                <div>
                  <Label>Return Time</Label>
                  <DateTimePicker
                    time={formState.returnTime}
                    onTimeChange={(t) => {
                      const update = { returnTime: t }
                      setFormState((prev) => ({ ...prev, ...update }))
                      syncQuote(update)
                    }}
                    showOnlyTime
                  />
                </div>

                <div className="grid gap-2 lg:col-span-2">
                  <Label>Passengers *</Label>
                  <input
                    type="number"
                    min={1}
                    value={formState.passengers}
                    onChange={(e) => {
                      const update = { passengers: parseInt(e.target.value) || 1 }
                      setFormState((prev) => ({ ...prev, ...update }))
                      syncQuote(update)
                    }}
                    className="border rounded-md px-3 py-2 bg-background"
                  />
                </div>
              </div>
            )}

            {/* Pax (for one-way layout) */}
            {tripType === "one-way" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="grid gap-2">
                  <Label>Passengers *</Label>
                  <input
                    type="number"
                    min={1}
                    value={formState.passengers}
                    onChange={(e) => {
                      const update = { passengers: parseInt(e.target.value) || 1 }
                      setFormState((prev) => ({ ...prev, ...update }))
                      syncQuote(update)
                    }}
                    className="border rounded-md px-3 py-2 bg-background"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multi-City */}
        {tripType === "multi-city" && (
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
                  <div className="grid gap-2 lg:col-span-2">
                    <Label>Origin *</Label>
                    <AirportCombobox
                      value={leg.origin_code}
                      onSelect={(a) =>
                        handleUpdateMultiLeg(leg.id, {
                          origin: a.airport,
                          origin_code: a.airport_code,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <Label>Destination *</Label>
                    <AirportCombobox
                      value={leg.destination_code}
                      onSelect={(a) =>
                        handleUpdateMultiLeg(leg.id, {
                          destination: a.airport,
                          destination_code: a.airport_code,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Departure Date *</Label>
                    <DateTimePicker
                      date={leg.departureDate}
                      onDateChange={(d) => handleUpdateMultiLeg(leg.id, { departureDate: d })}
                      showOnlyDate
                    />
                  </div>

                  <div>
                    <Label>Departure Time</Label>
                    <DateTimePicker
                      time={leg.departureTime}
                      onTimeChange={(t) => handleUpdateMultiLeg(leg.id, { departureTime: t })}
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
                        handleUpdateMultiLeg(leg.id, {
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
        )}

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Details
          </Button>
          <Button onClick={onNext} disabled={!isValid}>
            Next: Aircraft Options <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
