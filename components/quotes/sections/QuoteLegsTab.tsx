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

  

  const legs = Array.isArray(quote.legs) ? quote.legs : []

  // ✈️ One-way / Round-trip form state
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
    origin_lat: legs[0]?.origin_lat ?? null,          // ✅ add
    origin_long: legs[0]?.origin_long ?? null,        // ✅ add
    destination_lat: legs[0]?.destination_lat ?? null,// ✅ add
    destination_long: legs[0]?.destination_long ?? null, // ✅ add
  })

  // 🧭 Multi-City form state
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
          },
        ]
  )

  /* ------------------ ✈️ Auto-save on form changes ------------------ */
  useEffect(() => {
    // Auto-save when form state changes (debounced)
    const timeoutId = setTimeout(() => {
      if (tripType !== "multi-city") {
        saveFormData()
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [formState, tripType])

  useEffect(() => {
    // Auto-save when multi-legs change (debounced)
    const timeoutId = setTimeout(() => {
      if (tripType === "multi-city") {
        saveFormData()
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [multiLegs, tripType])

  /* ------------------ ✈️ Save form data to parent ------------------ */
  const saveFormData = () => {
    console.log("🛫 QuoteLegsTab saveFormData called", {
      tripType,
      formState: {
        departureDate: formState.departureDate,
        departureTime: formState.departureTime,
        returnDate: formState.returnDate,
        returnTime: formState.returnTime,
      },
      multiLegs: multiLegs.map(leg => ({
        departureDate: leg.departureDate,
        departureTime: leg.departureTime,
      }))
    })

    if (tripType === "multi-city") {
      // Save multi-city legs with proper date handling
      const processedLegs = multiLegs.map(leg => ({
        ...leg,
        departureDate: leg.departureDate || null,
        departureTime: leg.departureTime || null,
      }))
      console.log("🛫 Processed multi-city legs:", processedLegs)
      onLegsChange(processedLegs)
      onUpdate({ 
        legs: processedLegs,
        trip_type: tripType 
      })
    } else {
      // Save one-way or round-trip legs
      const newLegs = [
        {
          id: legs[0]?.id || crypto.randomUUID(),
          origin: formState.origin,
          origin_code: formState.origin_code,
          destination: formState.destination,
          destination_code: formState.destination_code,
          departureDate: formState.departureDate || null,
          departureTime: formState.departureTime || null,
          passengers: formState.passengers,
          origin_lat: formState.origin_lat,
          origin_long: formState.origin_long,
          destination_lat: formState.destination_lat,
          destination_long: formState.destination_long,
        }
      ]
      
      // Add return leg for round-trip
      if (tripType === "round-trip" && formState.returnDate) {
        newLegs.push({
          id: legs[1]?.id || crypto.randomUUID(),
          origin: formState.destination,
          origin_code: formState.destination_code,
          destination: formState.origin,
          destination_code: formState.origin_code,
          departureDate: formState.returnDate || null,
          departureTime: formState.returnTime || null,
          passengers: formState.passengers,
          origin_lat: formState.destination_lat,
          origin_long: formState.destination_long,
          destination_lat: formState.origin_lat,
          destination_long: formState.origin_long,
        })
      }
      
      console.log("🛫 Processed one-way/round-trip legs:", newLegs)
      onLegsChange(newLegs)
      onUpdate({ 
        legs: newLegs,
        trip_type: tripType 
      })
    }
  }

  /* ------------------ ✈️ Navigate (save handled by parent) ------------------ */
  const handleSaveAndNavigate = (direction: "next" | "back") => {
    saveFormData() // Save before navigating
    direction === "next" ? onNext() : onBack()
  }

  /* ------------------ 🧱 Multi-leg Handlers ------------------ */
const handleAddLeg = () => {
  const newLeg: Leg = {
    id: crypto.randomUUID(),
    origin: "",
    origin_code: "",
    destination: "",
    destination_code: "",
    departureDate: "",
    departureTime: "",
    passengers: multiLegs[multiLegs.length - 1]?.passengers || 1,
    origin_lat: null,
    origin_long: null,
    destination_lat: null,
    destination_long: null,
  };
  setMultiLegs([...multiLegs, newLeg]);
};





  const handleRemoveLeg = (id: string) => {
    setMultiLegs((prev) => prev.filter((l) => l.id !== id))
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

        {/* --- One-Way / Round-Trip Layout --- */}
        {(tripType === "one-way" || tripType === "round-trip") && (
          <div className="space-y-4 p-4 border rounded-lg bg-background/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Origin */}
              <div className="grid gap-2 lg:col-span-2">
                <Label>Origin *</Label>
<AirportCombobox
  value={formState.origin_code}
  onSelect={(a) =>
    setFormState((prev) => ({
      ...prev,
      origin: a.airport,
      origin_code: a.airport_code,
      origin_lat: a.lat ?? null,
      origin_long: a.lon ?? null,
    }))
  }
/>

              </div>

              {/* Destination */}
              <div className="grid gap-2 lg:col-span-2">
                <Label>Destination *</Label>
  <AirportCombobox
    value={formState.destination_code}
    onSelect={(a) =>
      setFormState((prev) => ({
        ...prev,
        destination: a.airport,
        destination_code: a.airport_code,
        destination_lat: a.lat ?? null,
        destination_long: a.lon ?? null,
      }))
    }
  />

              </div>

              {/* Departure Date */}
              <div>
                <Label>Departure Date *</Label>
                <DateTimePicker
                  date={formState.departureDate}
                  onDateChange={(d) => {
                    console.log("📅 Departure date changed:", d)
                    setFormState((prev) => ({ ...prev, departureDate: d }))
                  }}
                  showOnlyDate
                />
              </div>

              {/* Departure Time */}
              <div>
                <Label>Departure Time</Label>
                <DateTimePicker
                  time={formState.departureTime}
                  onTimeChange={(t) => setFormState((prev) => ({ ...prev, departureTime: t }))}
                  showOnlyTime
                />
              </div>
            </div>

            {tripType === "round-trip" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Return Date */}
                <div>
                  <Label>Return Date *</Label>
                  <DateTimePicker
                    date={formState.returnDate}
                    onDateChange={(d) => {
                      console.log("📅 Return date changed:", d)
                      setFormState((prev) => ({ ...prev, returnDate: d }))
                    }}
                    showOnlyDate
                  />
                </div>

                {/* Return Time */}
                <div>
                  <Label>Return Time</Label>
                  <DateTimePicker
                    time={formState.returnTime}
                    onTimeChange={(t) => setFormState((prev) => ({ ...prev, returnTime: t }))}
                    showOnlyTime
                  />
                </div>
              </div>
            )}

            {/* Passengers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
              <div className="grid gap-2">
                <Label>Passengers *</Label>
                <input
                  type="number"
                  min={1}
                  value={formState.passengers}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      passengers: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="border rounded-md px-3 py-2 bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- Multi-City Layout --- */}
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
                setMultiLegs((prev) =>
                  prev.map((l) =>
                    l.id === leg.id
                      ? {
                          ...l,
                          origin: a.airport,
                          origin_code: a.airport_code,
                          origin_lat: a.lat ?? null,
                          origin_long: a.lon ?? null,
                        }
                      : l
                  )
                )
              }
            />

                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <Label>Destination *</Label>
 <AirportCombobox
              value={leg.destination_code}
              onSelect={(a) =>
                setMultiLegs((prev) =>
                  prev.map((l) =>
                    l.id === leg.id
                      ? {
                          ...l,
                          destination: a.airport,
                          destination_code: a.airport_code,
                          destination_lat: a.lat ?? null,
                          destination_long: a.lon ?? null,
                        }
                      : l
                  )
                )
              }
            />

                  </div>

                  <div>
                    <Label>Departure Date *</Label>
                    <DateTimePicker
                      date={leg.departureDate}
                      onDateChange={(d) => {
                        console.log("📅 Multi-city leg date changed:", { legId: leg.id, date: d })
                        setMultiLegs((prev) =>
                          prev.map((l) => (l.id === leg.id ? { ...l, departureDate: d } : l))
                        )
                      }}
                      showOnlyDate
                    />
                  </div>

                  <div>
                    <Label>Departure Time</Label>
                    <DateTimePicker
                      time={leg.departureTime}
                      onTimeChange={(t) =>
                        setMultiLegs((prev) =>
                          prev.map((l) => (l.id === leg.id ? { ...l, departureTime: t } : l))
                        )
                      }
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
                        setMultiLegs((prev) =>
                          prev.map((l) =>
                            l.id === leg.id
                              ? { ...l, passengers: parseInt(e.target.value) || 1 }
                              : l
                          )
                        )
                      }
                      className="border rounded-md px-3 py-2 bg-background"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Only Multi-City shows Add Leg */}
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
          <Button variant="outline" onClick={() => handleSaveAndNavigate("back")}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Details
          </Button>
          <Button onClick={() => handleSaveAndNavigate("next")}>
            Next: Aircraft Options <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
