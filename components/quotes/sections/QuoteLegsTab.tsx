"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AirportCombobox } from "@/components/ui/airport-combobox"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Plane, ChevronRight, Plus, Trash2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Quote, Leg } from "@/lib/types"
import { format } from "date-fns"

type TripType = "one-way" | "round-trip" | "multi-city"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onLegsChange: (legs: any[]) => void
  onNext: () => void
  onBack: () => void
}

// Helper functions for date conversion
const stringToDate = (dateString: string | null | undefined): Date | undefined => {
  if (!dateString || dateString.trim() === "") return undefined
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? undefined : date
}

const dateToString = (date: Date | undefined): string => {
  if (!date) return ""
  // Format as YYYY-MM-DD for ISO string compatibility
  return format(date, "yyyy-MM-dd")
}

const timeToString = (time: string | null | undefined): string => {
  if (!time || time.trim() === "") return ""
  // Ensure time is in HH:mm format
  if (time.includes(":")) {
    const [hours, minutes] = time.split(":")
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
  }
  return time
}

export function QuoteLegsTab({ quote, onUpdate, onLegsChange, onNext, onBack }: Props) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [tripType, setTripType] = useState<TripType>(quote.trip_type || "one-way")

  const legs = Array.isArray(quote.legs) ? quote.legs : []

  // Popover states for date pickers
  const [departureDateOpen, setDepartureDateOpen] = useState(false)
  const [returnDateOpen, setReturnDateOpen] = useState(false)
  const [multiLegDateOpen, setMultiLegDateOpen] = useState<Record<string, boolean>>({})

  // ✈️ One-way / Round-trip form state
  const [formState, setFormState] = useState({
    origin: legs[0]?.origin || "",
    origin_code: legs[0]?.origin_code || "",
    destination: legs[0]?.destination || "",
    destination_code: legs[0]?.destination_code || "",
    departureDate: stringToDate(legs[0]?.departureDate || legs[0]?.depart_dt),
    departureTime: legs[0]?.departureTime || legs[0]?.depart_time || "",
    returnDate: stringToDate(legs[1]?.departureDate || legs[1]?.depart_dt),
    returnTime: legs[1]?.departureTime || legs[1]?.depart_time || "",
    passengers: legs[0]?.passengers || legs[0]?.pax_count || 1,
    origin_lat: legs[0]?.origin_lat ?? null,
    origin_long: legs[0]?.origin_long ?? null,
    destination_lat: legs[0]?.destination_lat ?? null,
    destination_long: legs[0]?.destination_long ?? null,
  })

  // 🧭 Multi-City form state
  const [multiLegs, setMultiLegs] = useState<(Leg & { departureDate?: Date | undefined })[]>(
    legs.length
      ? legs.map((l) => ({
          id: l.id || crypto.randomUUID(),
          origin: l.origin || "",
          origin_code: l.origin_code || "",
          destination: l.destination || "",
          destination_code: l.destination_code || "",
          departureDate: stringToDate(l.departureDate || l.depart_dt),
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
            departureDate: undefined,
            departureTime: "",
            passengers: 1,
            origin_lat: null,
            origin_long: null,
            destination_lat: null,
            destination_long: null,
          },
        ]
  )

  // 🔄 Sync form state when quote.legs changes (e.g., after save/reload)
  useEffect(() => {
    if (!legs.length) return
    
    // Only update if the data actually changed to avoid unnecessary re-renders
    const currentFirstLeg = legs[0]
    const currentSecondLeg = legs[1]
    
    setFormState((prev) => {
      const newDepartureDate = stringToDate(currentFirstLeg?.departureDate || currentFirstLeg?.depart_dt)
      const newReturnDate = stringToDate(currentSecondLeg?.departureDate || currentSecondLeg?.depart_dt)
      const newState = {
        origin: currentFirstLeg?.origin || "",
        origin_code: currentFirstLeg?.origin_code || "",
        destination: currentFirstLeg?.destination || "",
        destination_code: currentFirstLeg?.destination_code || "",
        departureDate: newDepartureDate,
        departureTime: currentFirstLeg?.departureTime || currentFirstLeg?.depart_time || "",
        returnDate: newReturnDate,
        returnTime: currentSecondLeg?.departureTime || currentSecondLeg?.depart_time || "",
        passengers: currentFirstLeg?.passengers || currentFirstLeg?.pax_count || 1,
        origin_lat: currentFirstLeg?.origin_lat ?? null,
        origin_long: currentFirstLeg?.origin_long ?? null,
        destination_lat: currentFirstLeg?.destination_lat ?? null,
        destination_long: currentFirstLeg?.destination_long ?? null,
      }
      
      // Only update if something actually changed
      if (
        prev.origin !== newState.origin ||
        prev.origin_code !== newState.origin_code ||
        prev.destination !== newState.destination ||
        prev.destination_code !== newState.destination_code ||
        prev.departureDate?.getTime() !== newState.departureDate?.getTime() ||
        prev.departureTime !== newState.departureTime ||
        prev.returnDate?.getTime() !== newState.returnDate?.getTime() ||
        prev.returnTime !== newState.returnTime ||
        prev.passengers !== newState.passengers
      ) {
        return newState
      }
      return prev
    })
    
    // Sync multi-legs if trip type is multi-city
    if (tripType === "multi-city" && legs.length > 0) {
      setMultiLegs((prev) => {
        const newLegs = legs.map((l) => ({
          id: l.id || crypto.randomUUID(),
          origin: l.origin || "",
          origin_code: l.origin_code || "",
          destination: l.destination || "",
          destination_code: l.destination_code || "",
          departureDate: stringToDate(l.departureDate || l.depart_dt),
          departureTime: l.departureTime || l.depart_time || "",
          passengers: l.passengers || l.pax_count || 1,
          origin_lat: l.origin_lat ?? null,
          origin_long: l.origin_long ?? null,
          destination_lat: l.destination_lat ?? null,
          destination_long: l.destination_long ?? null,
        }))
        
        // Only update if something changed
        if (
          prev.length !== newLegs.length ||
          prev.some((p, i) => {
            const n = newLegs[i]
            return (
              !n ||
              p.origin !== n.origin ||
              p.origin_code !== n.origin_code ||
              p.destination !== n.destination ||
              p.destination_code !== n.destination_code ||
              p.departureDate?.getTime() !== n.departureDate?.getTime() ||
              p.departureTime !== n.departureTime ||
              p.passengers !== n.passengers
            )
          })
        ) {
          return newLegs
        }
        return prev
      })
    }
  }, [quote.legs, tripType])

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

    // Helper to normalize Date objects or strings to string or null
    const normalizeDate = (date: Date | string | null | undefined): string | null => {
      if (!date) return null
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : dateToString(date)
      }
      if (typeof date === 'string' && date.trim() === '') return null
      if (typeof date === 'string') return date.trim()
      return null
    }
    
    const normalizeTime = (time: string | null | undefined): string | null => {
      if (!time || typeof time !== 'string' || time.trim() === '') return null
      return time.trim()
    }

    if (tripType === "multi-city") {
      // Save multi-city legs with proper date handling
      const processedLegs = multiLegs.map(leg => ({
        ...leg,
        departureDate: normalizeDate(leg.departureDate),
        departureTime: normalizeTime(leg.departureTime),
        // Remove departureDate if it's a Date object (it's been converted to string)
        ...(leg.departureDate instanceof Date ? {} : {})
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
          departureDate: normalizeDate(formState.departureDate),
          departureTime: normalizeTime(formState.departureTime),
          passengers: formState.passengers,
          origin_lat: formState.origin_lat,
          origin_long: formState.origin_long,
          destination_lat: formState.destination_lat,
          destination_long: formState.destination_long,
        }
      ]
      
      // Add return leg for round-trip
      if (tripType === "round-trip" && normalizeDate(formState.returnDate)) {
        newLegs.push({
          id: legs[1]?.id || crypto.randomUUID(),
          origin: formState.destination,
          origin_code: formState.destination_code,
          destination: formState.origin,
          destination_code: formState.origin_code,
          departureDate: normalizeDate(formState.returnDate),
          departureTime: normalizeTime(formState.returnTime),
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
  const newLeg: Leg & { departureDate?: Date | undefined } = {
    id: crypto.randomUUID(),
    origin: "",
    origin_code: "",
    destination: "",
    destination_code: "",
    departureDate: undefined,
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
              <div className="flex flex-col gap-3">
                <Label htmlFor="departure-date-picker" className="px-1">Departure Date *</Label>
                <Popover open={departureDateOpen} onOpenChange={setDepartureDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="departure-date-picker"
                      className="w-full justify-between font-normal"
                    >
                      {formState.departureDate 
                        ? format(formState.departureDate, "MMM dd, yyyy")
                        : "Select date"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formState.departureDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setFormState((prev) => ({ ...prev, departureDate: date }))
                        setDepartureDateOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Departure Time */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="departure-time-picker" className="px-1">Departure Time</Label>
                <Input
                  type="time"
                  id="departure-time-picker"
                  value={timeToString(formState.departureTime)}
                  onChange={(e) => setFormState((prev) => ({ ...prev, departureTime: e.target.value }))}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>

            {tripType === "round-trip" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                {/* Return Date */}
                <div className="flex flex-col gap-3">
                  <Label htmlFor="return-date-picker" className="px-1">Return Date *</Label>
                  <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="return-date-picker"
                        className="w-full justify-between font-normal"
                      >
                        {formState.returnDate 
                          ? format(formState.returnDate, "MMM dd, yyyy")
                          : "Select date"}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formState.returnDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          setFormState((prev) => ({ ...prev, returnDate: date }))
                          setReturnDateOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Return Time */}
                <div className="flex flex-col gap-3">
                  <Label htmlFor="return-time-picker" className="px-1">Return Time</Label>
                  <Input
                    type="time"
                    id="return-time-picker"
                    value={timeToString(formState.returnTime)}
                    onChange={(e) => setFormState((prev) => ({ ...prev, returnTime: e.target.value }))}
                    className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
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
                  onFocus={(e) => e.target.select()}
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

                  <div className="flex flex-col gap-3">
                    <Label htmlFor={`leg-${leg.id}-date-picker`} className="px-1">Departure Date *</Label>
                    <Popover 
                      open={multiLegDateOpen[leg.id] || false} 
                      onOpenChange={(open) => setMultiLegDateOpen(prev => ({ ...prev, [leg.id]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id={`leg-${leg.id}-date-picker`}
                          className="w-full justify-between font-normal"
                        >
                          {leg.departureDate 
                            ? format(leg.departureDate, "MMM dd, yyyy")
                            : "Select date"}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={leg.departureDate}
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            console.log("📅 Multi-city leg date changed:", { legId: leg.id, date })
                            setMultiLegs((prev) =>
                              prev.map((l) => (l.id === leg.id ? { ...l, departureDate: date } : l))
                            )
                            setMultiLegDateOpen(prev => ({ ...prev, [leg.id]: false }))
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label htmlFor={`leg-${leg.id}-time-picker`} className="px-1">Departure Time</Label>
                    <Input
                      type="time"
                      id={`leg-${leg.id}-time-picker`}
                      value={timeToString(leg.departureTime)}
                      onChange={(e) =>
                        setMultiLegs((prev) =>
                          prev.map((l) => (l.id === leg.id ? { ...l, departureTime: e.target.value } : l))
                        )
                      }
                      className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
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
                      onFocus={(e) => e.target.select()}
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
