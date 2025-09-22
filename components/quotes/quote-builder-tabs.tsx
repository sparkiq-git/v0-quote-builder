"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  User,
  Plane,
  Settings,
  Share,
  CalendarIcon,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  FileText,
  Edit,
  Check,
  X,
  Hash,
  ChevronsUpDown,
} from "lucide-react"
import type { Quote, QuoteOption, Service, Customer, Leg } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"
import { formatCurrency, generateQuoteToken } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface QuoteBuilderTabsProps {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
}

export function QuoteBuilderTabs({ quote, onUpdate }: QuoteBuilderTabsProps) {
  const { state, dispatch } = useMockStore()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [currentTab, setCurrentTab] = useState("details")
  const [editingImages, setEditingImages] = useState<{ optionId: string; images: string[] } | null>(null)

  const isDetailsValid = () => {
    return (
      quote.customer.name.trim().length > 0 &&
      quote.customer.email.trim().length > 0 &&
      quote.customer.phone.trim().length > 0 &&
      quote.expiresAt &&
      quote.terms.trim().length > 0
    )
  }

  const isLegsValid = () => {
    return (
      quote.legs.length > 0 &&
      quote.legs.every(
        (leg) =>
          leg.origin.trim().length > 0 &&
          leg.destination.trim().length > 0 &&
          leg.departureDate.trim().length > 0 &&
          leg.departureTime.trim().length > 0 &&
          leg.passengers > 0,
      )
    )
  }

  const isOptionsValid = () => {
    return (
      quote.options.length > 0 &&
      quote.options.every((option) => option.aircraftModelId && option.totalHours > 0 && option.operatorCost > 0)
    )
  }

  const isServicesValid = () => {
    return true // Services are optional
  }

  const handleNext = (nextTab: string) => {
    setCurrentTab(nextTab)
  }

  const handleBack = (prevTab: string) => {
    setCurrentTab(prevTab)
  }

  const handleUpdateCustomer = (updates: Partial<Customer>) => {
    onUpdate({
      customer: { ...quote.customer, ...updates },
    })
  }

  const handleAddLeg = () => {
    const newLeg: Leg = {
      id: `leg-${Date.now()}`,
      origin: "",
      destination: "",
      departureDate: "",
      departureTime: "",
      passengers: 1,
    }

    onUpdate({
      legs: [...quote.legs, newLeg],
    })
  }

  const handleUpdateLeg = (legId: string, updates: Partial<Leg>) => {
    const updatedLegs = quote.legs.map((leg) => (leg.id === legId ? { ...leg, ...updates } : leg))
    onUpdate({ legs: updatedLegs })
  }

  const handleRemoveLeg = (legId: string) => {
    if (quote.legs.length > 1) {
      onUpdate({
        legs: quote.legs.filter((leg) => leg.id !== legId),
      })
    }
  }

  const handleAddOption = () => {
    const activeModels = (state.aircraftModels || []).filter((model) => !model.isArchived)
    const firstModel = activeModels[0]

    const newOption: QuoteOption = {
      id: `option-${Date.now()}`,
      aircraftModelId: firstModel?.id || "",
      aircraftTailId: undefined, // No specific tail selected initially
      totalHours: 0,
      operatorCost: 0,
      commission: 0,
      tax: 0,
      selectedAmenities: [], // Will be populated when aircraft is selected
    }

    onUpdate({
      options: [...quote.options, newOption],
    })
  }

  const handleEditImages = (optionId: string) => {
    const option = quote.options.find((o) => o.id === optionId)
    if (!option) return

    const selectedModel = (state.aircraftModels || []).find((m) => m.id === option.aircraftModelId)
    const selectedTail = option.aircraftTailId
      ? (state.aircraftTails || []).find((t) => t.id === option.aircraftTailId)
      : undefined

    // Use override images if available, otherwise use model/tail images
    let currentImages = option.overrideImages || []
    if (currentImages.length === 0) {
      if (selectedTail && selectedTail.images && selectedTail.images.length > 0) {
        currentImages = selectedTail.images
      } else if (selectedModel && selectedModel.images && selectedModel.images.length > 0) {
        currentImages = selectedModel.images
      }
    }

    setEditingImages({ optionId, images: [...currentImages] })
  }

  const handleSaveImages = () => {
    if (!editingImages) return

    handleUpdateOption(editingImages.optionId, {
      overrideImages: editingImages.images.length > 0 ? editingImages.images : undefined,
    })
    setEditingImages(null)
    toast({
      title: "Images updated",
      description: "Aircraft images have been updated for this option.",
    })
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

  const handleUpdateOption = (optionId: string, updates: Partial<QuoteOption>) => {
    const updatedOptions = quote.options.map((option) => (option.id === optionId ? { ...option, ...updates } : option))
    onUpdate({ options: updatedOptions })
  }

  const handleRemoveOption = (optionId: string) => {
    onUpdate({
      options: quote.options.filter((option) => option.id !== optionId),
    })
  }

  const handleAddService = () => {
    const newService: Service = {
      id: `service-${Date.now()}`,
      name: "",
      description: "",
      amount: 0,
    }

    onUpdate({
      services: [...quote.services, newService],
    })
  }

  const handleUpdateService = (serviceId: string, updates: Partial<Service>) => {
    const updatedServices = quote.services.map((service) =>
      service.id === serviceId ? { ...service, ...updates } : service,
    )
    onUpdate({ services: updatedServices })
  }

  const handleRemoveService = (serviceId: string) => {
    onUpdate({
      services: quote.services.filter((service) => service.id !== serviceId),
    })
  }

  const handlePublish = () => {
    if (!quote.token) {
      const token = generateQuoteToken()
      onUpdate({
        token,
        publishedAt: new Date().toISOString(),
      })
      toast({
        title: "Quote published",
        description: "Your quote is now available via public link.",
      })
    }
  }

  const handleCopyLink = () => {
    if (quote.token) {
      const url = `${window.location.origin}/q/${quote.token}`
      navigator.clipboard.writeText(url)
      toast({
        title: "Link copied",
        description: "The quote link has been copied to your clipboard.",
      })
    }
  }

  const calculateOptionTotal = (option: QuoteOption) => {
    return option.operatorCost + option.commission + option.tax
  }

  const calculateQuoteTotal = () => {
    const optionsTotal = quote.options.reduce((sum, option) => sum + calculateOptionTotal(option), 0)
    const servicesTotal = quote.services.reduce((sum, service) => sum + service.amount, 0)
    return optionsTotal + servicesTotal
  }

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="details" className="cursor-default">
          Details
        </TabsTrigger>
        <TabsTrigger value="legs" className="cursor-default">
          Legs
        </TabsTrigger>
        <TabsTrigger value="options" className="cursor-default">
          Aircraft
        </TabsTrigger>
        <TabsTrigger value="services" className="cursor-default">
          Services
        </TabsTrigger>
        <TabsTrigger value="summary" className="cursor-default">
          Summary
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Quote Details
            </CardTitle>
            <CardDescription>Customer information and quote terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customer-name">Full Name *</Label>
                  <Input
                    id="customer-name"
                    value={quote.customer.name}
                    onChange={(e) => handleUpdateCustomer({ name: e.target.value })}
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-email">Email Address *</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={quote.customer.email}
                    onChange={(e) => handleUpdateCustomer({ email: e.target.value })}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-phone">Phone Number *</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    value={quote.customer.phone}
                    onChange={(e) => handleUpdateCustomer({ phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-company">Company (Optional)</Label>
                  <Input
                    id="customer-company"
                    value={quote.customer.company || ""}
                    onChange={(e) => handleUpdateCustomer({ company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Quote Terms */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiration">Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {quote.expiresAt ? format(new Date(quote.expiresAt), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                        if (date) {
                          onUpdate({ expiresAt: date.toISOString() })
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={quote.terms}
                  onChange={(e) => onUpdate({ terms: e.target.value })}
                  placeholder="Enter terms and conditions..."
                  rows={4}
                />
              </div>
            </div>

            {/* Next button with validation */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => handleNext("legs")} disabled={!isDetailsValid()}>
                Next: Trip Legs
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="legs" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  Trip Legs
                </CardTitle>
                <CardDescription>Configure the trip itinerary with multiple legs as needed</CardDescription>
              </div>
              <Button onClick={handleAddLeg}>
                <Plus className="mr-2 h-4 w-4" />
                Add Leg
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.legs.map((leg, index) => (
                <div key={leg.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">Leg {index + 1}</Badge>
                    {quote.legs.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => handleRemoveLeg(leg.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`origin-${leg.id}`}>Origin *</Label>
                      <Input
                        id={`origin-${leg.id}`}
                        value={leg.origin}
                        onChange={(e) => handleUpdateLeg(leg.id, { origin: e.target.value })}
                        placeholder="e.g., FXE, KFXE"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`destination-${leg.id}`}>Destination *</Label>
                      <Input
                        id={`destination-${leg.id}`}
                        value={leg.destination}
                        onChange={(e) => handleUpdateLeg(leg.id, { destination: e.target.value })}
                        placeholder="e.g., TEB, KTEB"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`date-${leg.id}`}>Departure Date *</Label>
                      <Input
                        id={`date-${leg.id}`}
                        type="date"
                        value={leg.departureDate}
                        onChange={(e) => handleUpdateLeg(leg.id, { departureDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`time-${leg.id}`}>Departure Time *</Label>
                      <Input
                        id={`time-${leg.id}`}
                        type="time"
                        value={leg.departureTime}
                        onChange={(e) => handleUpdateLeg(leg.id, { departureTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`passengers-${leg.id}`}>Passengers *</Label>
                      <Input
                        id={`passengers-${leg.id}`}
                        type="number"
                        min="1"
                        max="50"
                        value={leg.passengers}
                        onChange={(e) => handleUpdateLeg(leg.id, { passengers: Number.parseInt(e.target.value) || 1 })}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`notes-${leg.id}`}>Notes (Optional)</Label>
                      <Input
                        id={`notes-${leg.id}`}
                        value={leg.notes || ""}
                        onChange={(e) => handleUpdateLeg(leg.id, { notes: e.target.value })}
                        placeholder="Special requirements or notes"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {quote.legs.length === 0 && (
                <div className="text-center py-8">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No legs added yet</h3>
                  <p className="text-muted-foreground mb-4">Add at least one leg to continue</p>
                  <Button onClick={handleAddLeg}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Leg
                  </Button>
                </div>
              )}
            </div>

            {/* Back and Next buttons with validation */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => handleBack("details")}>
                <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back: Details
              </Button>
              <Button onClick={() => handleNext("options")} disabled={!isLegsValid()}>
                Next: Aircraft Options
                <ChevronRight className="ml-2 h-4 w-4" />
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between bg-transparent"
                              >
                                {selectedTail ? (
                                  <span className="flex items-center gap-2">
                                    <Hash className="h-4 w-4" />
                                    {selectedModel?.name} ({selectedTail.tailNumber})
                                  </span>
                                ) : selectedModel ? (
                                  <span className="flex items-center gap-2">
                                    <Plane className="h-4 w-4" />
                                    {selectedModel.name}
                                  </span>
                                ) : (
                                  "Select aircraft..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command className="border rounded-lg">
                                <CommandInput placeholder="Search aircraft models and tails..." />
                                <CommandList className="max-h-[200px]">
                                  <CommandEmpty>No aircraft found.</CommandEmpty>
                                  <CommandGroup heading="Aircraft Models">
                                    {(state.aircraftModels || [])
                                      .filter((model) => !model.isArchived)
                                      .map((model) => {
                                        const category = (state.categories || []).find((c) => c.id === model.categoryId)
                                        return (
                                          <CommandItem
                                            key={model.id}
                                            value={`model-${model.id}`}
                                            onSelect={() => {
                                              handleUpdateOption(option.id, {
                                                aircraftModelId: model.id,
                                                aircraftTailId: undefined,
                                              })
                                            }}
                                            className="flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Plane className="h-4 w-4" />
                                              <div>
                                                <div className="font-medium">{model.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {category?.name} • {model.passengerCapacity} passengers
                                                </div>
                                              </div>
                                            </div>
                                            {option.aircraftModelId === model.id && !option.aircraftTailId && (
                                              <Check className="h-4 w-4" />
                                            )}
                                          </CommandItem>
                                        )
                                      })}
                                  </CommandGroup>
                                  <CommandGroup heading="Specific Tails">
                                    {(state.aircraftTails || [])
                                      .filter((tail) => !tail.isArchived && tail.status === "active")
                                      .map((tail) => {
                                        const model = (state.aircraftModels || []).find((m) => m.id === tail.modelId)
                                        const category = model
                                          ? (state.categories || []).find((c) => c.id === model.categoryId)
                                          : undefined
                                        return (
                                          <CommandItem
                                            key={tail.id}
                                            value={`tail-${tail.id}`}
                                            onSelect={() => {
                                              const tailAmenities = tail.amenities
                                                ? tail.amenities
                                                    .split(",")
                                                    .map((a) => a.trim())
                                                    .filter(Boolean)
                                                : []

                                              handleUpdateOption(option.id, {
                                                aircraftModelId: tail.modelId,
                                                aircraftTailId: tail.id,
                                                selectedAmenities: tailAmenities, // Pre-select all tail amenities
                                              })
                                            }}
                                            className="flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-2">
                                              <Hash className="h-4 w-4" />
                                              <div>
                                                <div className="font-medium">
                                                  {model?.name} ({tail.tailNumber})
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                  {category?.name} • {tail.operator} • {tail.year}
                                                </div>
                                              </div>
                                            </div>
                                            {option.aircraftTailId === tail.id && <Check className="h-4 w-4" />}
                                          </CommandItem>
                                        )
                                      })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="grid gap-2">
                          <Label>Aircraft Amenities</Label>
                          {selectedTail ? (
                            // Tail selected - show amenities from tail with ability to add more
                            <div className="space-y-2">
                              <MultiSelectCombobox
                                options={
                                  selectedTail.amenities
                                    ? selectedTail.amenities
                                        .split(",")
                                        .map((a) => a.trim())
                                        .filter(Boolean)
                                    : []
                                }
                                selected={option.selectedAmenities}
                                onSelectionChange={(amenities) => {
                                  handleUpdateOption(option.id, {
                                    selectedAmenities: amenities,
                                  })
                                }}
                                placeholder="Select amenities from this tail"
                                emptyText="No amenities available for this tail."
                              />
                              {(!selectedTail.amenities || selectedTail.amenities.trim() === "") && (
                                <div className="p-3 border rounded-lg bg-muted/50">
                                  <Label htmlFor={`custom-amenities-${option.id}`} className="text-sm font-medium">
                                    Add Custom Amenities
                                  </Label>
                                  <input
                                    id={`custom-amenities-${option.id}`}
                                    type="text"
                                    placeholder="Enter amenities separated by commas"
                                    className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const value = e.currentTarget.value.trim()
                                        if (value) {
                                          const newAmenities = value
                                            .split(",")
                                            .map((a) => a.trim())
                                            .filter(Boolean)
                                          handleUpdateOption(option.id, {
                                            selectedAmenities: [...option.selectedAmenities, ...newAmenities],
                                          })
                                          e.currentTarget.value = ""
                                        }
                                      }
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">Press Enter to add amenities</p>
                                </div>
                              )}
                            </div>
                          ) : selectedModel ? (
                            // Model selected but no specific tail - show input for custom amenities
                            <div className="p-3 border rounded-lg bg-muted/50">
                              <Label htmlFor={`model-amenities-${option.id}`} className="text-sm font-medium">
                                Add Amenities
                              </Label>
                              <input
                                id={`model-amenities-${option.id}`}
                                type="text"
                                placeholder="Enter amenities separated by commas"
                                className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const value = e.currentTarget.value.trim()
                                    if (value) {
                                      const newAmenities = value
                                        .split(",")
                                        .map((a) => a.trim())
                                        .filter(Boolean)
                                      handleUpdateOption(option.id, {
                                        selectedAmenities: [...option.selectedAmenities, ...newAmenities],
                                      })
                                      e.currentTarget.value = ""
                                    }
                                  }
                                }}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Press Enter to add amenities. Select a specific tail to choose from available amenities.
                              </p>
                              {option.selectedAmenities.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {option.selectedAmenities.map((amenity) => (
                                    <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                                      {amenity}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateOption(option.id, {
                                            selectedAmenities: option.selectedAmenities.filter((a) => a !== amenity),
                                          })
                                        }}
                                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 border rounded-lg bg-muted/50 text-center">
                              <p className="text-sm text-muted-foreground">
                                Select an aircraft first to configure amenities.
                              </p>
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

                    <div className="grid grid-cols-4 gap-4">
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
                      <div className="grid gap-2">
                        <Label>Tax</Label>
                        <Input
                          type="number"
                          value={option.tax}
                          onChange={(e) =>
                            handleUpdateOption(option.id, { tax: Number.parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
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
                          {formatCurrency(option.commission)} + Tax: {formatCurrency(option.tax)}
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
                    <div className="grid gap-2">
                      <Label>Service Name</Label>
                      <Input
                        value={service.name}
                        onChange={(e) => handleUpdateService(service.id, { name: e.target.value })}
                        placeholder="e.g., Catering"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input
                        value={service.description}
                        onChange={(e) => handleUpdateService(service.id, { description: e.target.value })}
                        placeholder="Service description"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        value={service.amount}
                        onChange={(e) =>
                          handleUpdateService(service.id, { amount: Number.parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0"
                      />
                    </div>
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
                  <span>{formatCurrency(quote.services.reduce((sum, service) => sum + service.amount, 0))}</span>
                </div>
              )}

              {/* Back and Next buttons (services are optional so next is always enabled) */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => handleBack("options")}>
                  <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                  Back: Aircraft Options
                </Button>
                <Button onClick={() => handleNext("summary")}>
                  Next: Summary
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
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
            {/* Customer Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Customer Information</h4>
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {quote.customer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{quote.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{quote.customer.email}</p>
                  <p className="text-sm text-muted-foreground">{quote.customer.company}</p>
                </div>
              </div>
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
                  const selectedModel = (state.aircraftModels || []).find((m) => m.id === option.aircraftModelId)
                  const selectedTail = option.aircraftTailId
                    ? (state.aircraftTails || []).find((t) => t.id === option.aircraftTailId)
                    : undefined

                  return (
                    <div key={option.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          Option {index + 1}: {selectedModel?.name || "Unknown Model"}
                          {selectedTail && ` (${selectedTail.tailNumber})`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {option.totalHours}h • Operator: {formatCurrency(option.operatorCost)} + Commission:{" "}
                          {formatCurrency(option.commission)} + Tax: {formatCurrency(option.tax)}
                          {option.selectedAmenities.length > 0 &&
                            ` • Amenities: ${option.selectedAmenities.join(", ")}`}
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
                      <a href={`/q/${quote.token}`} target="_blank" rel="noopener noreferrer">
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
