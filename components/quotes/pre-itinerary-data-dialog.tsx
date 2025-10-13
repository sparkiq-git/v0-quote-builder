"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Building2,
  UserCheck,
  Utensils,
  Accessibility,
  Plus,
  X,
  FileText,
  Cloud,
  Plane,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import { CrewCreateDialog } from "@/components/crew/crew-create-dialog"
import type { Quote, PassengerWithLegs } from "@/lib/types"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface PreItineraryDataDialogProps {
  quote: Quote
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreItineraryDataDialog({ quote, open, onOpenChange }: PreItineraryDataDialogProps) {
  const { dispatch, state, createItineraryFromQuote } = useMockStore()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("crew")

  const availableCrew = state.crewMembers || []
  const availableFbos = state.fbos || []

  const [selectedCrew, setSelectedCrew] = useState<string[]>([])
  const [crewComboboxOpen, setCrewComboboxOpen] = useState(false)
  const [addCrewDialogOpen, setAddCrewDialogOpen] = useState(false)

  const [crewSpecialRequirements, setCrewSpecialRequirements] = useState("")
  const [crewLegAssignments, setCrewLegAssignments] = useState<Record<string, string[]>>(() => {
    const assignments: Record<string, string[]> = {}
    availableCrew.forEach((crew) => {
      assignments[crew.id] = quote.legs.map((leg) => leg.id)
    })
    return assignments
  })

  const [legFbos, setLegFbos] = useState<Record<string, { originFboId?: string; destinationFboId?: string }>>(() => {
    const initial: Record<string, { originFboId?: string; destinationFboId?: string }> = {}
    quote.legs.forEach((leg) => {
      initial[leg.id] = {
        originFboId: leg.fboOriginId,
        destinationFboId: leg.fboDestinationId,
      }
    })
    return initial
  })
  const [fboSpecialServices, setFboSpecialServices] = useState<string[]>([])
  const [newFboService, setNewFboService] = useState("")

  const [passengers, setPassengers] = useState<PassengerWithLegs[]>([
    {
      name: "",
      assignedLegIds: quote.legs.map((leg) => leg.id),
      hasSpecialRequests: false,
      specialRequests: "",
      hasDietaryRestrictions: false,
      dietaryRestrictions: "",
      hasAccessibilityNeeds: false,
      accessibilityNeeds: "",
    },
  ])

  const [weatherNotes, setWeatherNotes] = useState<Record<string, string>>({})
  const [operationalNotes, setOperationalNotes] = useState("")

  const originFbo = availableFbos.find((fbo) => fbo.id === quote.legs[0]?.fboOriginId)
  const destinationFbo = availableFbos.find((fbo) => fbo.id === quote.legs[quote.legs.length - 1]?.fboDestinationId)

  const handleContinue = () => {
    const tabs = ["crew", "fbo", "passengers", "operations", "weather"]
    const currentIndex = tabs.indexOf(activeTab)
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    }
  }

  const addPassenger = () => {
    setPassengers([
      ...passengers,
      {
        name: "",
        assignedLegIds: quote.legs.map((leg) => leg.id),
        hasSpecialRequests: false,
        specialRequests: "",
        hasDietaryRestrictions: false,
        dietaryRestrictions: "",
        hasAccessibilityNeeds: false,
        accessibilityNeeds: "",
      },
    ])
  }

  const updatePassengerName = (index: number, name: string) => {
    const updated = [...passengers]
    updated[index].name = name
    setPassengers(updated)
  }

  const updatePassengerField = (index: number, field: keyof PassengerWithLegs, value: any) => {
    const updated = [...passengers]
    updated[index] = { ...updated[index], [field]: value }
    setPassengers(updated)
  }

  const updatePassengerLegs = (legId: string, passengerIndex: number, checked: boolean) => {
    const updated = [...passengers]
    if (checked) {
      updated[passengerIndex].assignedLegIds = [...updated[passengerIndex].assignedLegIds, legId]
    } else {
      updated[passengerIndex].assignedLegIds = updated[passengerIndex].assignedLegIds.filter((id) => id !== legId)
    }
    setPassengers(updated)
  }

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter((_, i) => i !== index))
    }
  }

  const updateCrewLegAssignment = (crewId: string, legId: string, checked: boolean) => {
    setCrewLegAssignments((prev) => {
      const current = prev[crewId] || []
      if (checked) {
        return { ...prev, [crewId]: [...current, legId] }
      } else {
        return { ...prev, [crewId]: current.filter((id) => id !== legId) }
      }
    })
  }

  const handleCrewSelect = (crewId: string) => {
    if (selectedCrew.includes(crewId)) {
      setSelectedCrew(selectedCrew.filter((id) => id !== crewId))
      setCrewLegAssignments((prev) => {
        const updated = { ...prev }
        delete updated[crewId]
        return updated
      })
    } else {
      setSelectedCrew([...selectedCrew, crewId])
      // Auto-assign to all legs by default
      setCrewLegAssignments((prev) => ({
        ...prev,
        [crewId]: quote.legs.map((leg) => leg.id),
      }))
    }
  }

  const handleRemoveCrew = (crewId: string) => {
    setSelectedCrew(selectedCrew.filter((id) => id !== crewId))
    setCrewLegAssignments((prev) => {
      const updated = { ...prev }
      delete updated[crewId]
      return updated
    })
  }

  const handleCrewAdded = () => {
    setAddCrewDialogOpen(false)
    toast({
      title: "Crew member added",
      description: "The new crew member is now available for selection.",
    })
  }

  const addFboService = () => {
    if (newFboService.trim()) {
      setFboSpecialServices([...fboSpecialServices, newFboService.trim()])
      setNewFboService("")
    }
  }

  const removeFboService = (index: number) => {
    setFboSpecialServices(fboSpecialServices.filter((_, i) => i !== index))
  }

  const updateLegFbo = (legId: string, type: "origin" | "destination", fboId: string) => {
    setLegFbos((prev) => ({
      ...prev,
      [legId]: {
        ...prev[legId],
        [type === "origin" ? "originFboId" : "destinationFboId"]: fboId,
      },
    }))
  }

  const handleSubmit = () => {
    console.log("[v0] Pre-Itinerary Dialog - Starting submit")
    console.log("[v0] Selected crew:", selectedCrew)
    console.log("[v0] Crew leg assignments:", crewLegAssignments)
    console.log("[v0] Passengers:", passengers)

    if (passengers.some((p) => p.name.trim() && passengers.filter((p2) => p2.name.trim()).length === 0)) {
      toast({
        title: "Passenger information incomplete",
        description: "Please complete all passenger names or remove empty entries.",
        variant: "destructive",
      })
      return
    }

    const specialRequirements: string[] = []
    passengers.forEach((p, idx) => {
      if (p.hasSpecialRequests && p.specialRequests?.trim()) {
        specialRequirements.push(`${p.name || `Passenger ${idx + 1}`}: ${p.specialRequests}`)
      }
      if (p.hasDietaryRestrictions && p.dietaryRestrictions?.trim()) {
        specialRequirements.push(`${p.name || `Passenger ${idx + 1}`} - Dietary: ${p.dietaryRestrictions}`)
      }
      if (p.hasAccessibilityNeeds && p.accessibilityNeeds?.trim()) {
        specialRequirements.push(`${p.name || `Passenger ${idx + 1}`} - Accessibility: ${p.accessibilityNeeds}`)
      }
    })
    fboSpecialServices.forEach((s) => specialRequirements.push(`FBO Service: ${s}`))

    const preItineraryData = {
      completedAt: new Date().toISOString(),
      completedBy: "Current User",
      crewInformation: {
        selectedCrewIds: selectedCrew,
        assignments: crewLegAssignments,
        specialRequirements: crewSpecialRequirements,
      },
      passengerDetails: passengers.filter((p) => p.name.trim()),
      fboInformation: {
        legFbos,
        specialServices: fboSpecialServices,
      },
      weatherNotes,
      operationalNotes,
      specialRequirements,
    }

    console.log("[v0] Pre-Itinerary Data being saved:", preItineraryData)

    const updates = {
      workflowData: {
        ...quote.workflowData,
        preItineraryData,
      },
    }

    dispatch({
      type: "UPDATE_QUOTE",
      payload: { id: quote.id, updates },
    })

    console.log("[v0] Quote updated, creating itinerary...")

    try {
      const itinerary = createItineraryFromQuote(quote.id, preItineraryData)
      console.log("[v0] Itinerary created:", itinerary)

      toast({
        title: "Itinerary created successfully",
        description: "The final itinerary has been generated and is ready to view.",
      })
    } catch (error) {
      console.error("[v0] Error creating itinerary:", error)
      toast({
        title: "Error creating itinerary",
        description: "There was an issue creating the itinerary. Please try again.",
        variant: "destructive",
      })
      return
    }

    onOpenChange(false)
  }

  const totalPassengers = quote.legs.reduce((max, leg) => Math.max(max, leg.passengers), 0)

  const uniqueAirports = Array.from(new Set(quote.legs.flatMap((leg) => [leg.origin, leg.destination])))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pre-Itinerary Data Entry
          </DialogTitle>
          <DialogDescription>
            Complete all required information before generating the final itinerary.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="crew" className="flex items-center gap-2">
              Crew
            </TabsTrigger>
            <TabsTrigger value="fbo" className="text-xs flex items-center gap-2">
              FBOs
            </TabsTrigger>
            <TabsTrigger value="passengers" className="text-xs flex items-center gap-2">
              Passengers
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs flex items-center gap-2">
              Operations
            </TabsTrigger>
            <TabsTrigger value="weather" className="text-xs flex items-center gap-2">
              Weather
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crew" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Flight Crew
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Select Crew Members (Optional)</Label>

                  <Popover open={crewComboboxOpen} onOpenChange={setCrewComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={crewComboboxOpen}
                        className="w-full justify-between bg-transparent"
                      >
                        {selectedCrew.length === 0 ? (
                          <span className="text-muted-foreground">Search and select crew members...</span>
                        ) : (
                          <span>
                            {selectedCrew.length} crew member{selectedCrew.length !== 1 ? "s" : ""} selected
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search crew members..." />
                        <CommandList>
                          <CommandEmpty>No crew members found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setCrewComboboxOpen(false)
                                setAddCrewDialogOpen(true)
                              }}
                              className="text-primary font-medium"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add New Crew Member
                            </CommandItem>
                            {availableCrew.map((crew) => (
                              <CommandItem
                                key={crew.id}
                                value={`${crew.name} ${crew.role}`}
                                onSelect={() => handleCrewSelect(crew.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCrew.includes(crew.id) ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{crew.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {crew.role} • {crew.totalFlightHours} hours
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedCrew.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
                      {selectedCrew.map((crewId) => {
                        const crew = availableCrew.find((c) => c.id === crewId)
                        if (!crew) return null
                        return (
                          <Badge key={crewId} variant="secondary" className="flex items-center gap-2 py-2 px-3">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{crew.name}</span>
                              <span className="text-xs text-muted-foreground">{crew.role}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCrew(crewId)}
                              className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="crew-requirements">Special Requirements</Label>
                    <Textarea
                      id="crew-requirements"
                      placeholder="Any special crew requirements or notes..."
                      value={crewSpecialRequirements}
                      onChange={(e) => setCrewSpecialRequirements(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {quote.legs.length > 1 && selectedCrew.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Assign Crew to Legs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select which crew members are assigned to each leg of the journey.
                  </p>
                  {quote.legs.map((leg, legIndex) => (
                    <div key={leg.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="font-medium">
                        Leg {legIndex + 1}: {leg.origin} → {leg.destination}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leg.departureDate} at {leg.departureTime}
                      </div>
                      <div className="space-y-2 mt-3">
                        {selectedCrew.map((crewId) => {
                          const crew = availableCrew.find((c) => c.id === crewId)
                          if (!crew) return null
                          return (
                            <div key={crewId} className="flex items-center space-x-2">
                              <div className="flex items-center justify-center w-4 h-4 border-2 border-primary/20 rounded shadow-sm bg-background">
                                <Checkbox
                                  id={`leg-${leg.id}-crew-${crewId}`}
                                  checked={crewLegAssignments[crewId]?.includes(leg.id) || false}
                                  onCheckedChange={(checked) =>
                                    updateCrewLegAssignment(crewId, leg.id, checked as boolean)
                                  }
                                />
                              </div>
                              <Label htmlFor={`leg-${leg.id}-crew-${crewId}`} className="text-sm cursor-pointer">
                                {crew.name}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {crew.role}
                                </Badge>
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fbo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  FBO Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {quote.legs.map((leg, index) => {
                    const selectedOriginFbo = availableFbos.find((fbo) => fbo.id === legFbos[leg.id]?.originFboId)
                    const selectedDestFbo = availableFbos.find((fbo) => fbo.id === legFbos[leg.id]?.destinationFboId)

                    const originFbos = availableFbos.filter((fbo) => fbo.airportCode === leg.origin)
                    const destFbos = availableFbos.filter((fbo) => fbo.airportCode === leg.destination)

                    return (
                      <div key={leg.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="font-medium">
                          Leg {index + 1}: {leg.origin} → {leg.destination}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {leg.departureDate} at {leg.departureTime}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="space-y-2">
                            <Label htmlFor={`origin-fbo-${leg.id}`}>Origin FBO ({leg.origin})</Label>
                            <Select
                              value={legFbos[leg.id]?.originFboId || ""}
                              onValueChange={(value) => updateLegFbo(leg.id, "origin", value)}
                            >
                              <SelectTrigger id={`origin-fbo-${leg.id}`}>
                                <SelectValue placeholder="Select origin FBO" />
                              </SelectTrigger>
                              <SelectContent>
                                {originFbos.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No FBOs available for {leg.origin}
                                  </SelectItem>
                                ) : (
                                  originFbos.map((fbo) => (
                                    <SelectItem key={fbo.id} value={fbo.id}>
                                      {fbo.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {selectedOriginFbo && (
                              <div className="p-2 border rounded bg-muted/50 text-xs">
                                <div className="font-medium">{selectedOriginFbo.name}</div>
                                <div className="text-muted-foreground mt-1">
                                  <div>{selectedOriginFbo.address}</div>
                                  <div>{selectedOriginFbo.phone}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`dest-fbo-${leg.id}`}>Destination FBO ({leg.destination})</Label>
                            <Select
                              value={legFbos[leg.id]?.destinationFboId || ""}
                              onValueChange={(value) => updateLegFbo(leg.id, "destination", value)}
                            >
                              <SelectTrigger id={`dest-fbo-${leg.id}`}>
                                <SelectValue placeholder="Select destination FBO" />
                              </SelectTrigger>
                              <SelectContent>
                                {destFbos.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No FBOs available for {leg.destination}
                                  </SelectItem>
                                ) : (
                                  destFbos.map((fbo) => (
                                    <SelectItem key={fbo.id} value={fbo.id}>
                                      {fbo.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {selectedDestFbo && (
                              <div className="p-2 border rounded bg-muted/50 text-xs">
                                <div className="font-medium">{selectedDestFbo.name}</div>
                                <div className="text-muted-foreground mt-1">
                                  <div>{selectedDestFbo.address}</div>
                                  <div>{selectedDestFbo.phone}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-3 mt-4">
                  <Label>Special FBO Services</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add special service..."
                      value={newFboService}
                      onChange={(e) => setNewFboService(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addFboService()}
                    />
                    <Button type="button" onClick={addFboService} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fboSpecialServices.map((service, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {service}
                        <button
                          type="button"
                          onClick={() => removeFboService(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passengers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Passenger Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Passenger Information (Max: {totalPassengers})</Label>

                  <div className="space-y-4">
                    {passengers.map((passenger, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex gap-2 items-start">
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Passenger ${index + 1} name`}
                                value={passenger.name}
                                onChange={(e) => updatePassengerName(index, e.target.value)}
                                className="flex-1"
                              />
                              {passengers.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removePassenger(index)}
                                  size="sm"
                                  variant="outline"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-4 h-4 border-2 border-primary/20 rounded shadow-sm bg-background">
                                  <Checkbox
                                    id={`passenger-${index}-special-requests`}
                                    checked={passenger.hasSpecialRequests || false}
                                    onCheckedChange={(checked) =>
                                      updatePassengerField(index, "hasSpecialRequests", checked)
                                    }
                                  />
                                </div>
                                <Label
                                  htmlFor={`passenger-${index}-special-requests`}
                                  className="text-sm font-medium flex items-center gap-2"
                                >
                                  <Utensils className="h-4 w-4" />
                                  Special Requests
                                </Label>
                              </div>
                              {passenger.hasSpecialRequests && (
                                <Textarea
                                  placeholder="Enter special requests..."
                                  value={passenger.specialRequests || ""}
                                  onChange={(e) => updatePassengerField(index, "specialRequests", e.target.value)}
                                  rows={2}
                                  className="ml-6"
                                />
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-4 h-4 border-2 border-primary/20 rounded shadow-sm bg-background">
                                  <Checkbox
                                    id={`passenger-${index}-dietary`}
                                    checked={passenger.hasDietaryRestrictions || false}
                                    onCheckedChange={(checked) =>
                                      updatePassengerField(index, "hasDietaryRestrictions", checked)
                                    }
                                  />
                                </div>
                                <Label
                                  htmlFor={`passenger-${index}-dietary`}
                                  className="text-sm font-medium flex items-center gap-2"
                                >
                                  Dietary Restrictions
                                </Label>
                              </div>
                              {passenger.hasDietaryRestrictions && (
                                <Textarea
                                  placeholder="Enter dietary restrictions..."
                                  value={passenger.dietaryRestrictions || ""}
                                  onChange={(e) => updatePassengerField(index, "dietaryRestrictions", e.target.value)}
                                  rows={2}
                                  className="ml-6"
                                />
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-4 h-4 border-2 border-primary/20 rounded shadow-sm bg-background">
                                  <Checkbox
                                    id={`passenger-${index}-accessibility`}
                                    checked={passenger.hasAccessibilityNeeds || false}
                                    onCheckedChange={(checked) =>
                                      updatePassengerField(index, "hasAccessibilityNeeds", checked)
                                    }
                                  />
                                </div>
                                <Label
                                  htmlFor={`passenger-${index}-accessibility`}
                                  className="text-sm font-medium flex items-center gap-2"
                                >
                                  <Accessibility className="h-4 w-4" />
                                  Accessibility Needs
                                </Label>
                              </div>
                              {passenger.hasAccessibilityNeeds && (
                                <Textarea
                                  placeholder="Enter accessibility needs..."
                                  value={passenger.accessibilityNeeds || ""}
                                  onChange={(e) => updatePassengerField(index, "accessibilityNeeds", e.target.value)}
                                  rows={2}
                                  className="ml-6"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      onClick={addPassenger}
                      variant="outline"
                      className="w-full bg-transparent"
                      disabled={passengers.length >= totalPassengers}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Passenger
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {quote.legs.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5" />
                    Assign Passengers to Legs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select which passengers are flying on each leg of the journey.
                  </p>
                  {quote.legs.map((leg, legIndex) => (
                    <div key={leg.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="font-medium">
                        Leg {legIndex + 1}: {leg.origin} → {leg.destination}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {leg.departureDate} at {leg.departureTime}
                      </div>
                      <div className="space-y-2 mt-3">
                        {passengers.map((passenger, passengerIndex) => (
                          <div key={passengerIndex} className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-4 h-4 border-2 border-primary/20 rounded shadow-sm bg-background">
                              <Checkbox
                                id={`leg-${leg.id}-passenger-${passengerIndex}`}
                                checked={passenger.assignedLegIds.includes(leg.id)}
                                onCheckedChange={(checked) =>
                                  updatePassengerLegs(leg.id, passengerIndex, checked as boolean)
                                }
                              />
                            </div>
                            <Label
                              htmlFor={`leg-${leg.id}-passenger-${passengerIndex}`}
                              className="text-sm cursor-pointer"
                            >
                              {passenger.name || `Passenger ${passengerIndex + 1}`}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Operational Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="operational-notes">Additional Notes</Label>
                  <Textarea
                    id="operational-notes"
                    placeholder="Add any operational notes, special instructions, or important information for the flight crew and ground operations..."
                    value={operationalNotes}
                    onChange={(e) => setOperationalNotes(e.target.value)}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weather" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Weather Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add weather forecast notes for each airport involved in the trip.
                  </p>
                  {uniqueAirports.map((airport) => (
                    <div key={airport} className="space-y-2">
                      <Label htmlFor={`weather-${airport}`}>{airport} Weather Forecast</Label>
                      <Textarea
                        id={`weather-${airport}`}
                        placeholder={`Enter weather forecast for ${airport}...`}
                        value={weatherNotes[airport] || ""}
                        onChange={(e) =>
                          setWeatherNotes((prev) => ({
                            ...prev,
                            [airport]: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab !== "weather" ? (
            <Button onClick={handleContinue}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit}>Build Itinerary</Button>
          )}
        </DialogFooter>
      </DialogContent>

      <CrewCreateDialog
        open={addCrewDialogOpen}
        onOpenChange={(open) => {
          setAddCrewDialogOpen(open)
          if (!open) {
            // Optionally auto-select the newly added crew member
            // This would require tracking the newly added crew ID
          }
        }}
      />
    </Dialog>
  )
}
