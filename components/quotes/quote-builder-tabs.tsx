"use client"

import { useState } from "react"
import { useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ModelCreateDialog } from "@/components/aircraft/model-create-dialog"
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"
import {
  Plane,
  Settings,
  Share,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  FileText,
  Edit,
  User,
} from "lucide-react"
import type { Quote, QuoteOption, QuoteFee, Service, Customer, Leg } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"
import { formatCurrency, generateQuoteToken } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { AirportCombobox } from "@/components/ui/airport-combobox"
import { AircraftCombobox } from "@/components/ui/aircraft-combobox"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { ContactCombobox } from "@/components/ui/contact-combobox"
import { Separator } from "@/components/ui/separator"
import { ItemCombobox } from "@/components/ui/item-combobox"

interface QuoteBuilderTabsProps {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
}

export function QuoteBuilderTabs({ quote, onUpdate }: QuoteBuilderTabsProps) {
  const { state, dispatch } = useMockStore()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [currentTab, setCurrentTab] = useState("details")
  const [editingImages, setEditingImages] = useState<{ optionId: string; images: string[] } | null>(null)
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showTailDialog, setShowTailDialog] = useState(false)
  const [currentOptionId, setCurrentOptionId] = useState<string | null>(null)
  const [showAmenityInput, setShowAmenityInput] = useState<{ [key: string]: boolean }>({})

  type TripType = "one-way" | "round-trip" | "multi-city"

  // infer trip type from quote.legs if not already stored
  const inferTripType = (legs: Leg[] = []): TripType => {
    if (!legs || legs.length <= 1) return "one-way"
    if (legs.length === 2) {
      const [a, b] = legs
      const isRoundTrip =
        a?.origin &&
        a?.destination &&
        b?.origin &&
        b?.destination &&
        a.origin === b.destination &&
        a.destination === b.origin
      if (isRoundTrip) return "round-trip"
    }
    return "multi-city"
  }

  // initialize from quote.tripType if it exists, else infer
  const [tripType, setTripType] = useState<TripType>(() => {
    return (quote.tripType as TripType) ?? inferTripType(quote.legs || [])
  })

  // keep local tripType synced when editing an existing quote
  useEffect(() => {
    const detected = (quote.tripType as TripType) ?? inferTripType(quote.legs || [])
    if (detected !== tripType) setTripType(detected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.tripType, quote.legs])

  // put this near the top of QuoteBuilderTabs (once)
  useEffect(() => {
    if (!quote.valid_until) {
      const base = new Date()
      base.setMinutes(0, 0, 0)
      base.setHours(base.getHours() + 12)
      onUpdate({ valid_until: base.toISOString() })
    }
  }, [quote.valid_until, onUpdate])

  // ✅ Keeps tripType synced with the quote object
  const handleTripTypeChange = (newType: TripType) => {
    if (newType === tripType) return
    setTripType(newType)
    onUpdate({ tripType: newType })
  }

  // ✅ Automatically maintain legs structure safely
  useEffect(() => {
    if (!quote.legs) return
    const legs = quote.legs

    // --- ONE WAY ---
    if (tripType === "one-way") {
      if (legs.length !== 1) {
        onUpdate({ legs: legs.slice(0, 1) })
      }

      // --- ROUND TRIP ---
    } else if (tripType === "round-trip") {
      const firstLeg = legs[0] || {
        id: `leg-${Date.now()}`,
        origin: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        passengers: 1,
      }

      // ✅ only build return leg once both origin and destination exist
      const hasValidRoute = firstLeg.origin && firstLeg.destination

      if (legs.length < 2 && hasValidRoute) {
        const returnLeg: Leg = {
          id: `leg-${Date.now()}-ret`,
          origin: firstLeg.destination,
          destination: firstLeg.origin,
          departureDate: "", // user picks
          departureTime: "",
          passengers: firstLeg.passengers,
        }
        onUpdate({ legs: [firstLeg, returnLeg] })
      } else if (legs.length === 2 && hasValidRoute) {
        // keep them in sync if user changes first leg
        const [first, ret] = legs
        const newReturn: Leg = {
          ...ret,
          origin: first.destination,
          destination: first.origin,
        }
        const hasChanged = newReturn.origin !== ret.origin || newReturn.destination !== ret.destination
        if (hasChanged) onUpdate({ legs: [first, newReturn] })
      } else if (legs.length > 2) {
        onUpdate({ legs: legs.slice(0, 2) })
      }

      // --- MULTI CITY ---
    } else if (tripType === "multi-city") {
      if (legs.length < 2) {
        const baseLeg = legs[0] || {
          id: `leg-${Date.now()}`,
          origin: "",
          destination: "",
          departureDate: "",
          departureTime: "",
          passengers: 1,
        }
        const secondLeg: Leg = {
          id: `leg-${Date.now()}-2`,
          origin: baseLeg.destination,
          destination: "",
          departureDate: "",
          departureTime: "",
          passengers: baseLeg.passengers,
        }
        onUpdate({ legs: [baseLeg, secondLeg] })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripType, quote.legs])

  // ======================
  // Validation Helpers
  // ======================
  const isDetailsValid = () =>
    quote.customer.name.trim().length > 0 &&
    quote.customer.email.trim().length > 0 &&
    quote.customer.phone.trim().length > 0 &&
    quote.expiresAt &&
    quote.terms.trim().length > 0

  const isLegsValid = () =>
    quote.legs.length > 0 &&
    quote.legs.every(
      (leg) =>
        leg.origin.trim().length > 0 &&
        leg.destination.trim().length > 0 &&
        leg.departureDate.trim().length > 0 &&
        leg.departureTime.trim().length > 0 &&
        leg.passengers > 0,
    )

  const isOptionsValid = () =>
    quote.options.length > 0 && quote.options.every((o) => o.aircraftModelId && o.totalHours > 0 && o.operatorCost > 0)

  const isServicesValid = () => true

  // ======================
  // Navigation
  // ======================
  const handleNext = (tab: string) => setCurrentTab(tab)
  const handleBack = (tab: string) => setCurrentTab(tab)

  // ======================
  // Customer + Legs CRUD
  // ======================
  const handleUpdateCustomer = (updates: Partial<Customer>) => onUpdate({ customer: { ...quote.customer, ...updates } })

  const handleAddLeg = () => {
    const newLeg: Leg = {
      id: `leg-${Date.now()}`,
      origin: "",
      destination: "",
      departureDate: "",
      departureTime: "",
      passengers: 1,
    }
    onUpdate({ legs: [...quote.legs, newLeg] })
  }

  const handleUpdateLeg = (id: string, updates: Partial<Leg>) => {
    onUpdate({ legs: quote.legs.map((l) => (l.id === id ? { ...l, ...updates } : l)) })
  }

  const handleRemoveLeg = (id: string) => {
    if (quote.legs.length > 1) onUpdate({ legs: quote.legs.filter((l) => l.id !== id) })
  }

  // ======================
  // Options CRUD
  // ======================
  const handleAddOption = () => {
    const firstModel = (state.aircraftModels || []).filter((m) => !m.isArchived)[0]
    const defaultFees: QuoteFee[] = [
      { id: `fee-${Date.now()}-1`, name: "US Domestic Segment Fee", amount: 4.3, isAutoCalculated: true },
      { id: `fee-${Date.now()}-2`, name: "US International Head Tax", amount: 19.1, isAutoCalculated: true },
      { id: `fee-${Date.now()}-3`, name: "Federal Excise Tax (FET)", amount: 0, isAutoCalculated: true },
    ]
    const newOption: QuoteOption = {
      id: `option-${Date.now()}`,
      aircraftModelId: firstModel?.id || "",
      totalHours: 0,
      operatorCost: 0,
      commission: 0,
      fees: defaultFees,
      feesEnabled: false,
      selectedAmenities: [],
    }
    onUpdate({ options: [...quote.options, newOption] })
  }

  const handleUpdateOption = (id: string, updates: Partial<QuoteOption>) => {
    onUpdate({ options: quote.options.map((o) => (o.id === id ? { ...o, ...updates } : o)) })
  }

  const handleRemoveOption = (id: string) => onUpdate({ options: quote.options.filter((o) => o.id !== id) })

  // ======================
  // Services CRUD
  // ======================
  const handleAddService = () =>
    onUpdate({
      services: [...quote.services, { id: `service-${Date.now()}`, name: "", description: "", amount: 0 }],
    })

  const handleUpdateService = (id: string, updates: Partial<Service>) =>
    onUpdate({ services: quote.services.map((s) => (s.id === id ? { ...s, ...updates } : s)) })

  const handleRemoveService = (id: string) => onUpdate({ services: quote.services.filter((s) => s.id !== id) })

  // ======================
  // Image Editing
  // ======================
  const handleEditImages = (optionId: string) => {
    const option = quote.options.find((o) => o.id === optionId)
    if (!option) return

    const selectedModel = (state.aircraftModels || []).find((m) => m.id === option.aircraftModelId)
    const selectedTail = option.aircraftTailId
      ? (state.aircraftTails || []).find((t) => t.id === option.aircraftTailId)
      : undefined

    let currentImages = option.overrideImages || []
    if (currentImages.length === 0) {
      if (selectedTail?.images?.length) currentImages = selectedTail.images
      else if (selectedModel?.images?.length) currentImages = selectedModel.images
    }
    setEditingImages({ optionId, images: [...currentImages] })
  }

  const handleSaveImages = () => {
    if (!editingImages) return
    handleUpdateOption(editingImages.optionId, {
      overrideImages: editingImages.images.length > 0 ? editingImages.images : undefined,
    })
    setEditingImages(null)
    toast({ title: "Images updated", description: "Aircraft images have been updated for this option." })
  }

  const handleAddImage = (url: string) => {
    if (!editingImages || !url.trim()) return
    setEditingImages({
      ...editingImages,
      images: [...editingImages.images, url.trim()],
    })
  }

  const handleRemoveImage = (index: number) => {
    if (!editingImages) return
    setEditingImages({
      ...editingImages,
      images: editingImages.images.filter((_, i) => i !== index),
    })
  }

  // ======================
  // Publishing
  // ======================
  const handlePublish = () => {
    if (!quote.token) {
      const token = generateQuoteToken()
      onUpdate({ token, publishedAt: new Date().toISOString() })
      toast({ title: "Quote published", description: "Your quote is now live." })
    }
  }

  const handleCopyLink = () => {
    if (quote.token) {
      const url = `${window.location.origin}/q/${quote.token}`
      navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Copied to clipboard." })
    }
  }

  const calculateOptionTotal = (o: QuoteOption) =>
    o.operatorCost + o.commission + (o.feesEnabled ? o.fees.reduce((s, f) => s + f.amount, 0) : 0)

  const calculateQuoteTotal = () =>
    quote.options.reduce((s, o) => s + calculateOptionTotal(o), 0) + quote.services.reduce((s, s2) => s + s2.amount, 0)

  // ======================
  // RETURN
  // ======================
  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="legs">Legs</TabsTrigger>
        <TabsTrigger value="options">Aircraft</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
      </TabsList>

      {/* DETAILS */}
      <TabsContent value="details" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Quote Details
            </CardTitle>
            <CardDescription>Specify the contact information and quote expiration</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Contact Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Contact Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {/* Contact Combobox */}
                <div className="grid gap-2">
                  <Label>Contact *</Label>
                  <ContactCombobox
                    tenantId={quote.tenant_id}
                    value={quote.contact_id || null}
                    selectedName={quote.customer?.name || quote.contact_name || null}
                    onSelect={(c) =>
                      onUpdate({
                        customer: {
                          id: c.id,
                          name: c.full_name || "",
                          email: c.email || "",
                          phone: c.phone || "",
                          company: c.company || "",
                        },
                      })
                    }
                  />
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label>Email *</Label>
                  <Input value={quote.customer?.email || ""} readOnly />
                </div>

                {/* Phone */}
                <div className="grid gap-2">
                  <Label>Phone *</Label>
                  <Input value={quote.customer?.phone || ""} readOnly />
                </div>

                {/* Company */}
                <div className="grid gap-2">
                  <Label>Company</Label>
                  <Input value={quote.customer?.company || ""} readOnly />
                </div>
              </div>
            </div>

            <Separator />

            {/* Quote Expiration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quote Expiration</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valid Until *</Label>

                  {/* Date ONLY – same pattern as Legs */}
                  <DateTimePicker
                    date={quote.valid_until || ""}
                    onDateChange={(d) => {
                      // d can be string or Date; normalize
                      const parsed = d instanceof Date ? d : new Date(d as unknown as string)

                      if (isNaN(parsed.getTime())) return
                      const current = new Date(quote.valid_until || new Date().toISOString())
                      current.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
                      onUpdate({ valid_until: current.toISOString() })
                    }}
                    showOnlyDate
                  />

                  {/* Time ONLY – same pattern as Legs */}
                  <DateTimePicker
                    time={
                      quote.valid_until
                        ? new Date(quote.valid_until)
                            .toISOString()
                            .slice(11, 16) // "HH:mm"
                        : ""
                    }
                    onTimeChange={(t) => {
                      let hours = 0
                      let minutes = 0

                      if (t instanceof Date) {
                        hours = t.getHours()
                        minutes = t.getMinutes()
                      } else if (typeof t === "string" && t.includes(":")) {
                        const parts = t.split(":")
                        hours = Number(parts[0]) || 0
                        minutes = Number(parts[1]) || 0
                      } else {
                        return
                      }

                      const current = new Date(quote.valid_until || new Date().toISOString())
                      current.setHours(hours, minutes, 0, 0)
                      onUpdate({ valid_until: current.toISOString() })
                    }}
                    showOnlyTime
                  />
                </div>

                {/* Notes */}
                <div className="grid gap-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Internal notes or additional comments"
                    value={quote.notes || ""}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => handleNext("legs")} disabled={!isDetailsValid()}>
                Next: Trip Legs
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* LEGS */}
      <TabsContent value="legs" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" /> Trip Legs
                </CardTitle>
                <CardDescription>Configure trip itinerary</CardDescription>
              </div>
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                {(["one-way", "round-trip", "multi-city"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTripTypeChange(type)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      tripType === type
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {type === "one-way" ? "One-Way" : type === "round-trip" ? "Round-Trip" : "Multi-City"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* One-way / Round-trip legs */}
            {(tripType === "one-way" || tripType === "round-trip") && quote.legs.length > 0 && (
              <div className="p-4 border rounded-lg bg-background/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label>Origin *</Label>
                    <AirportCombobox
                      value={quote.legs[0].origin}
                      onChange={(v) => handleUpdateLeg(quote.legs[0].id, { origin: v })}
                      placeholder="Enter origin"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Destination *</Label>
                    <AirportCombobox
                      value={quote.legs[0].destination}
                      onChange={(v) => handleUpdateLeg(quote.legs[0].id, { destination: v })}
                      placeholder="Enter destination"
                    />
                  </div>
                  <div>
                    <Label>Departure Date *</Label>
                    <DateTimePicker
                      date={quote.legs[0].departureDate}
                      onDateChange={(d) => handleUpdateLeg(quote.legs[0].id, { departureDate: d })}
                      showOnlyDate
                    />
                  </div>
                  <div>
                    <Label>Departure Time *</Label>
                    <DateTimePicker
                      time={quote.legs[0].departureTime}
                      onTimeChange={(t) => handleUpdateLeg(quote.legs[0].id, { departureTime: t })}
                      showOnlyTime
                    />
                  </div>
                </div>

                {tripType === "round-trip" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                    <div>
                      <Label>Return Date *</Label>
                      <DateTimePicker
                        date={quote.legs[1]?.departureDate || ""}
                        onDateChange={(d) => handleUpdateLeg(quote.legs[1]?.id || "", { departureDate: d })}
                        showOnlyDate
                      />
                    </div>
                    <div>
                      <Label>Return Time *</Label>
                      <DateTimePicker
                        time={quote.legs[1]?.departureTime || ""}
                        onTimeChange={(t) => handleUpdateLeg(quote.legs[1]?.id || "", { departureTime: t })}
                        showOnlyTime
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Multi-city */}
            {tripType === "multi-city" && (
              <div className="space-y-4">
                {quote.legs.map((leg, i) => (
                  <div key={leg.id} className="p-4 border rounded-lg bg-background/20">
                    <div className="flex justify-between mb-3">
                      <Badge variant="outline">Leg {i + 1}</Badge>
                      {quote.legs.length > 2 && (
                        <Button variant="outline" size="sm" onClick={() => handleRemoveLeg(leg.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="grid gap-2">
                        <Label>Origin *</Label>
                        <AirportCombobox
                          value={leg.origin}
                          onChange={(v) => handleUpdateLeg(leg.id, { origin: v })}
                          placeholder="Enter origin"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Destination *</Label>
                        <AirportCombobox
                          value={leg.destination}
                          onChange={(v) => handleUpdateLeg(leg.id, { destination: v })}
                          placeholder="Enter destination"
                        />
                      </div>
                      <div>
                        <Label>Departure Date *</Label>
                        <DateTimePicker
                          date={leg.departureDate}
                          onDateChange={(d) => handleUpdateLeg(leg.id, { departureDate: d })}
                          showOnlyDate
                        />
                      </div>
                      <div>
                        <Label>Departure Time *</Label>
                        <DateTimePicker
                          time={leg.departureTime}
                          onTimeChange={(t) => handleUpdateLeg(leg.id, { departureTime: t })}
                          showOnlyTime
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {quote.legs.length < 6 && (
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleAddLeg}>
                    <Plus className="mr-2 h-4 w-4" /> Add Another Leg
                  </Button>
                )}
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => handleBack("details")}>
                <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Details
              </Button>
              <Button onClick={() => handleNext("options")} disabled={!isLegsValid()}>
                Next: Aircraft Options <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="options" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Aircraft Options
                </CardTitle>
                <CardDescription>Add and configure aircraft options for this quote</CardDescription>
              </div>
              <Button onClick={handleAddOption}>
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quote.options.map((option) => {
                const selectedModel = (state.aircraftModels || []).find((m) => m.id === option.aircraftModelId)
                const selectedTail = option.aircraftTailId
                  ? (state.aircraftTails || []).find((t) => t.id === option.aircraftTailId)
                  : undefined
                const selectedCategory = selectedModel
                  ? (state.categories || []).find((c) => c.id === selectedModel.categoryId)
                  : undefined
                const availableTails = selectedModel
                  ? (state.aircraftTails || []).filter(
                      (t) => t.modelId === selectedModel.id && !t.isArchived && t.status === "active",
                    )
                  : []

                const getDisplayImages = () => {
                  if (option.overrideImages && option.overrideImages.length > 0) {
                    return option.overrideImages
                  }
                  if (selectedTail && selectedTail.images && selectedTail.images.length > 0) {
                    return selectedTail.images
                  }
                  if (selectedModel && selectedModel.images && selectedModel.images.length > 0) {
                    return selectedModel.images
                  }
                  return [
                    `/placeholder.svg?height=300&width=500&query=${encodeURIComponent(`${selectedModel?.name || "aircraft"} aircraft`)}`,
                  ]
                }

                const displayImages = getDisplayImages()

                return (
                  <div key={option.id} className="p-6 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Aircraft Option</h4>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveOption(option.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Left Column: Aircraft Selection and Amenities */}
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label>Aircraft Selection</Label>

                          <AircraftCombobox
                            value={option.aircraftTailId || null}
                            onSelect={(a) => {
                              handleUpdateOption(option.id, {
                                aircraftTailId: a.aircraft_id,
                                aircraftModelId: null,
                                selectedAmenities: a.amenities || [],
                                aircraft_tail_number: a.tail_number,
                                aircraft_operator: a.operator_name,
                                aircraft_model: a.model_name,
                                aircraft_manufacturer: a.manufacturer_name,
                                aircraft_capacity: a.capacity_pax,
                                aircraft_range: a.range_nm,
                              })
                            }}
                          />

                          {option.aircraftTailId && (
                            <div className="p-3 rounded-md bg-muted/40 border mt-2 space-y-1">
                              <p className="text-sm font-medium">{option.aircraft_tail_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {option.aircraft_manufacturer} {option.aircraft_model}
                                {option.aircraft_operator ? ` • Operated by ${option.aircraft_operator}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {option.aircraft_capacity ? `${option.aircraft_capacity} pax` : ""}{" "}
                                {option.aircraft_range ? `• ${option.aircraft_range} nm range` : ""}
                              </p>
                              {option.selectedAmenities?.length ? (
                                <p className="text-xs text-muted-foreground">
                                  Amenities: {option.selectedAmenities.join(", ")}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Aircraft Images */}
                      <div className="space-y-2">
                        {selectedModel && (
                          <>
                            <div className="flex items-center justify-between">
                              <Label>Aircraft Images</Label>
                              <Button variant="outline" size="sm" onClick={() => handleEditImages(option.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Images
                              </Button>
                            </div>
                            <div className="relative">
                              <Carousel className="w-full">
                                <CarouselContent>
                                  {displayImages.map((image, index) => (
                                    <CarouselItem key={index}>
                                      <div className="w-full aspect-[16/4] relative rounded-lg overflow-hidden bg-muted">
                                        <img
                                          src={image || "/placeholder.svg"}
                                          alt={`${selectedModel.name} - Image ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement
                                            target.src = `/placeholder.svg?height=300&width=500&query=${encodeURIComponent(`${selectedModel.name} aircraft`)}`
                                          }}
                                        />
                                      </div>
                                    </CarouselItem>
                                  ))}
                                </CarouselContent>
                                {displayImages.length > 1 && (
                                  <>
                                    <CarouselPrevious className="left-2" />
                                    <CarouselNext className="right-2" />
                                  </>
                                )}
                              </Carousel>
                              {option.overrideImages && (
                                <Badge variant="secondary" className="absolute top-2 right-2">
                                  Custom Images
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedModel && (
                      <div className="space-y-3">
                        <div className="mt-4 mb-4 p-3 bg-muted rounded-lg">
                          <h5 className="font-medium mb-2">Aircraft Model Specifications</h5>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Capacity:</span>
                              <p className="font-medium">
                                {selectedTail && selectedTail.capacityOverride
                                  ? selectedTail.capacityOverride
                                  : selectedModel.defaultCapacity || "N/A"}{" "}
                                passengers
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Range:</span>
                              <p className="font-medium">
                                {selectedTail && selectedTail.rangeNmOverride
                                  ? selectedTail.rangeNmOverride
                                  : selectedModel.defaultRangeNm || "N/A"}{" "}
                                nm
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Speed:</span>
                              <p className="font-medium">
                                {selectedTail && selectedTail.speedKnotsOverride
                                  ? selectedTail.speedKnotsOverride
                                  : selectedModel.defaultSpeedKnots || "N/A"}{" "}
                                knots
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Model: {selectedModel.name} • Category: {selectedCategory?.name || "Unknown"}
                              {selectedModel.manufacturer && ` • Manufacturer: ${selectedModel.manufacturer}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Total Hours</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={option.totalHours}
                          onChange={(e) =>
                            handleUpdateOption(option.id, { totalHours: Number.parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Operator Cost</Label>
                        <Input
                          type="number"
                          value={option.operatorCost}
                          onChange={(e) =>
                            handleUpdateOption(option.id, { operatorCost: Number.parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Commission</Label>
                        <Input
                          type="number"
                          value={option.commission}
                          onChange={(e) =>
                            handleUpdateOption(option.id, { commission: Number.parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4 mt-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-medium">Aircraft Fees & Taxes</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable to display and calculate specific fees and taxes
                          </p>
                        </div>
                        <Switch
                          checked={option.feesEnabled}
                          onCheckedChange={(enabled) => {
                            // Auto-calculate FET when enabling fees
                            if (enabled && option.operatorCost > 0) {
                              const updatedFees = option.fees.map((fee) => {
                                if (fee.name === "Federal Excise Tax (FET)") {
                                  return {
                                    ...fee,
                                    amount: Math.round(option.operatorCost * 0.075 * 100) / 100, // 7.5% of operator cost
                                  }
                                }
                                return fee
                              })
                              handleUpdateOption(option.id, { feesEnabled: enabled, fees: updatedFees })
                            } else {
                              handleUpdateOption(option.id, { feesEnabled: enabled })
                            }
                          }}
                        />
                      </div>

                      {option.feesEnabled && (
                        <div className="space-y-3">
                          {option.fees.map((fee) => (
                            <div key={fee.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={fee.name}
                                    onChange={(e) => {
                                      const updatedFees = option.fees.map((f) =>
                                        f.id === fee.id ? { ...f, name: e.target.value } : f,
                                      )
                                      handleUpdateOption(option.id, { fees: updatedFees })
                                    }}
                                    className="font-medium"
                                    placeholder="Fee name"
                                  />
                                </div>
                                {fee.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{fee.description}</p>
                                )}
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={fee.amount}
                                  onChange={(e) => {
                                    const updatedFees = option.fees.map((f) =>
                                      f.id === fee.id
                                        ? {
                                            ...f,
                                            amount: Number.parseFloat(e.target.value) || 0,
                                            isAutoCalculated: false, // Mark as manually adjusted
                                          }
                                        : f,
                                    )
                                    handleUpdateOption(option.id, { fees: updatedFees })
                                  }}
                                  placeholder="0.00"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const updatedFees = option.fees.filter((f) => f.id !== fee.id)
                                  handleUpdateOption(option.id, { fees: updatedFees })
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newFee: QuoteFee = {
                                id: `fee-${Date.now()}`,
                                name: "Custom Fee",
                                amount: 0,
                                isAutoCalculated: false,
                              }
                              handleUpdateOption(option.id, {
                                fees: [...option.fees, newFee],
                              })
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Fee
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="grid gap-2">
                        <Label htmlFor={`special-notes-${option.id}`}>Special Notes</Label>
                        <Textarea
                          id={`special-notes-${option.id}`}
                          value={option.conditions || ""}
                          onChange={(e) => handleUpdateOption(option.id, { conditions: e.target.value })}
                          placeholder="Enter any special notes for this aircraft option..."
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2"></div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-medium">Total Cost:</span>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Operator: {formatCurrency(option.operatorCost)} + Commission:{" "}
                          {formatCurrency(option.commission)}
                          {option.feesEnabled && option.fees.length > 0 && (
                            <> + Fees: {formatCurrency(option.fees.reduce((sum, fee) => sum + fee.amount, 0))}</>
                          )}
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(calculateOptionTotal(option))}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {quote.options.length === 0 && (
                <div className="text-center py-8">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No aircraft options yet</h3>
                  <p className="text-muted-foreground mb-4">Add aircraft options to complete your quote</p>
                  <Button onClick={handleAddOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Option
                  </Button>
                </div>
              )}

              {quote.options.length > 0 && (
                <div className="text-center py-4">
                  <Button onClick={handleAddOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Option
                  </Button>
                </div>
              )}

              {/* Back and Next buttons with validation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => handleBack("legs")}>
                  <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                  Back: Trip Legs
                </Button>
                <Button onClick={() => handleNext("services")} disabled={!isOptionsValid()}>
                  Next: Services
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!editingImages} onOpenChange={(open) => !open && setEditingImages(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Aircraft Images</DialogTitle>
              <DialogDescription>
                Customize the images that will be shown for this aircraft option in the quote.
              </DialogDescription>
            </DialogHeader>

            {editingImages && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {editingImages.images.map((image, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=60&width=100&query=aircraft`
                          }}
                        />
                      </div>
                      <Input
                        value={image}
                        onChange={(e) => {
                          const newImages = [...editingImages.images]
                          newImages[index] = e.target.value
                          setEditingImages({ ...editingImages, images: newImages })
                        }}
                        placeholder="Image URL"
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={() => handleRemoveImage(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add new image URL"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddImage(e.currentTarget.value)
                        e.currentTarget.value = ""
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      handleAddImage(input.value)
                      input.value = ""
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Press Enter or click the + button to add a new image URL. These custom images will override the
                  default aircraft catalog images for this quote option.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingImages(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveImages}>Save Images</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogs for creating aircraft models and tails */}
        <ModelCreateDialog
          open={showModelDialog}
          onOpenChange={(open) => {
            setShowModelDialog(open)
            if (!open) {
              // When dialog closes, check if a new model was created and select it
              const latestModel = (state.aircraftModels || [])
                .filter((m) => !m.isArchived)
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]

              if (latestModel && currentOptionId) {
                handleUpdateOption(currentOptionId, {
                  aircraftModelId: latestModel.id,
                  aircraftTailId: undefined,
                })
                toast({
                  title: "Model selected",
                  description: `${latestModel.name} has been selected for this option.`,
                })
              }
              setCurrentOptionId(null)
            }
          }}
        >
          <div />
        </ModelCreateDialog>

        <TailCreateDialog
          open={showTailDialog}
          onOpenChange={(open) => {
            setShowTailDialog(open)
            if (!open) {
              // When dialog closes, check if a new tail was created and select it
              const latestTail = (state.aircraftTails || [])
                .filter((t) => !t.isArchived && t.status === "active")
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]

              if (latestTail && currentOptionId) {
                const tailAmenities = latestTail.amenities
                  ? latestTail.amenities
                      .split(",")
                      .map((a) => a.trim())
                      .filter(Boolean)
                  : []

                handleUpdateOption(currentOptionId, {
                  aircraftModelId: latestTail.modelId,
                  aircraftTailId: latestTail.id,
                  selectedAmenities: tailAmenities,
                })
                toast({
                  title: "Tail selected",
                  description: `${latestTail.tailNumber} has been selected for this option.`,
                })
              }
              setCurrentOptionId(null)
            }
          }}
        >
          <div />
        </TailCreateDialog>
      </TabsContent>

      <TabsContent value="services" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Additional Services
                </CardTitle>
                <CardDescription>Add optional services and fees</CardDescription>
              </div>
              <Button onClick={handleAddService}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.services.map((service) => (
                <div key={service.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Service Item</h4>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveService(service.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Service Name via ItemCombobox */}
                    <div className="grid gap-2">
                      <Label>Service Name</Label>
                      <ItemCombobox
                        tenantId={quote.tenant_id}
                        value={service.item_id || null}
                        onSelect={(item) => {
                          handleUpdateService(service.id, {
                            item_id: item.id,
                            name: item.name,
                            description: item.default_notes || "",
                            amount: item.default_unit_price || 0,
                            taxable: item.default_taxable ?? true,
                          })
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input
                        value={service.description || ""}
                        onChange={(e) => handleUpdateService(service.id, { description: e.target.value })}
                        placeholder="Service description"
                      />
                    </div>

                    {/* Amount */}
                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={service.amount}
                        onChange={(e) =>
                          handleUpdateService(service.id, {
                            amount: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Taxable Toggle */}
                  <div className="flex items-center gap-2 mt-3">
                    <Switch
                      checked={service.taxable ?? true}
                      onCheckedChange={(checked) => handleUpdateService(service.id, { taxable: checked })}
                    />
                    <Label className="text-sm text-muted-foreground">Taxable</Label>
                  </div>
                </div>
              ))}

              {quote.services.length === 0 && (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No services added</h3>
                  <p className="text-muted-foreground mb-4">Add optional services like catering or ground transport</p>
                  <Button onClick={handleAddService}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              )}

              {quote.services.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t font-medium">
                  <span>Services Total:</span>
                  <span>{formatCurrency(quote.services.reduce((sum, s) => sum + (s.amount || 0), 0))}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* New Summary tab with comprehensive preview and publish functionality */}
      <TabsContent value="summary" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Summary
            </CardTitle>
            <CardDescription>Review and publish your quote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contact Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Contact Information</h4>
              {quote.contact_id ? (
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {quote.contact_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{quote.contact_name}</p>
                    <p className="text-sm text-muted-foreground">{quote.contact_email}</p>
                    <p className="text-sm text-muted-foreground">{quote.contact_phone}</p>
                    {quote.contact_company && <p className="text-sm text-muted-foreground">{quote.contact_company}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contact selected for this quote.</p>
              )}
            </div>

            {/* Trip Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Trip Details</h4>
              <div className="space-y-2">
                {quote.legs.map((leg, index) => (
                  <div key={leg.id} className="flex justify-between text-sm">
                    <span>
                      Leg {index + 1}: {leg.origin} → {leg.destination}
                    </span>
                    <span>
                      {leg.departureDate} • {leg.passengers} passengers
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm">
                  <strong>Expires:</strong> {quote.expiresAt ? format(new Date(quote.expiresAt), "PPP") : "Not set"}
                </p>
              </div>
            </div>

            {/* Aircraft Options Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Aircraft Options ({quote.options.length})</h4>
              <div className="space-y-3">
                {quote.options.map((option, index) => {
                  const selectedModel =
                    (state.aircraftModels || []).find(
                      (m) => m.id === option.aircraftModelId || m.id === option.model_id,
                    ) ||
                    option.aircraftModel ||
                    null

                  const selectedTail = option.aircraftTailId
                    ? (state.aircraftTails || []).find((t) => t.id === option.aircraftTailId)
                    : undefined

                  const modelName = selectedModel?.name || selectedTail?.model_name || "Unknown Model"

                  const tailNumber = selectedTail?.tailNumber ? ` (${selectedTail.tailNumber})` : ""

                  return (
                    <div key={option.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          Option {index + 1}: {modelName}
                          {tailNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {option.totalHours}h • Operator: {formatCurrency(option.operatorCost)} + Commission:{" "}
                          {formatCurrency(option.commission)}
                          {option.feesEnabled && option.fees.length > 0 && (
                            <> + Fees: {formatCurrency(option.fees.reduce((sum, fee) => sum + fee.amount, 0))}</>
                          )}
                          {option.selectedAmenities?.length > 0 && (
                            <> • Amenities: {option.selectedAmenities.join(", ")}</>
                          )}
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(calculateOptionTotal(option))}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Services Summary */}
            {quote.services.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Additional Services ({quote.services.length})</h4>
                <div className="space-y-2">
                  {quote.services.map((service) => (
                    <div key={service.id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                      </div>
                      <span className="font-medium">{formatCurrency(service.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back button to summary tab */}
            <div className="flex justify-start pt-4 border-t">
              <Button variant="outline" onClick={() => handleBack("services")}>
                <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back: Services
              </Button>
            </div>

            {/* Publish Section */}
            {!quote.token ? (
              <div className="text-center py-6 border-t">
                <h4 className="font-medium mb-2">Ready to publish?</h4>
                <p className="text-muted-foreground mb-4">
                  Publishing will generate a public link that you can share with your customer.
                </p>
                <Button onClick={handlePublish} size="lg">
                  <Share className="mr-2 h-4 w-4" />
                  Publish Quote
                </Button>
              </div>
            ) : (
              <div className="space-y-4 border-t pt-6">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Quote Published!</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Your quote is now live and accessible via the public link below.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`${window.location.origin}/q/${quote.token}`}
                      readOnly
                      className="bg-white dark:bg-gray-900"
                    />
                    <Button onClick={handleCopyLink} variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline">
                      <a href={`${window.location.origin}/q/${quote.token}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
