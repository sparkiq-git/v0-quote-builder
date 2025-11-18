"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Plane, Plus, Trash2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AircraftCombobox } from "@/components/ui/aircraft-combobox"
import { TailCreateDialog } from "@/components/aircraft/tail-create-dialog"
import { AircraftSummaryCard } from "@/components/aircraft/AircraftSummaryCard"
import { formatCurrency } from "@/lib/utils/format"
import { useEffect } from "react"
import type { Quote, QuoteOption, QuoteFee, AircraftFull } from "@/lib/types"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onNext: () => void
  onBack: () => void
}



export function QuoteOptionsTab({ quote, onUpdate, onNext, onBack }: Props) {
  const { toast } = useToast()
  const options = Array.isArray(quote?.options) ? quote.options : []
  const [tailCreateDialogOpen, setTailCreateDialogOpen] = useState(false)
  const [pendingTailOptionId, setPendingTailOptionId] = useState<string | null>(null)
  const [editTailId, setEditTailId] = useState<string | null>(null)
  const [aircraftCache, setAircraftCache] = useState<Record<string, AircraftFull>>({})
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Helper to get passenger count from quote legs
  const getPassengerCount = (): number => {
    // Get passenger count from the first leg (all legs should have the same passenger count)
    const legs = Array.isArray(quote?.legs) ? quote.legs : []
    if (legs.length > 0) {
      return legs[0]?.passengers || legs[0]?.pax_count || 1
    }
    return 1 // Default fallback
  }

  // Calculate fees based on enabled switches
  const calculateFees = (option: any) => {
    const operatorCost = option.cost_operator || 0
    const passengerCount = getPassengerCount()
    
    let price_fet = 0
    let price_extras_total = 0
    let price_taxes = 0

    if (option.fetEnabled === true) {
      price_fet = operatorCost * 0.075 // 7.5% of operator cost
    }
    if (option.usDomesticEnabled === true) {
      price_extras_total = 5 * passengerCount // $5 per passenger
    }
    if (option.usInternationalEnabled === true) {
      price_taxes = 22.40 * passengerCount // $22.40 per passenger
    }

    return { price_fet, price_extras_total, price_taxes }
  }

  // 🧩 Normalize options after quote is loaded (ensures fee switches are initialized)
useEffect(() => {
  if (!quote?.options) return

  const normalized = quote.options.map((o: any) => {
    const normalizedOption = {
      ...o,
      // Initialize fee switches if not present (default to false - users enable as needed)
      fetEnabled: o.fetEnabled !== undefined ? o.fetEnabled : false,
      usDomesticEnabled: o.usDomesticEnabled !== undefined ? o.usDomesticEnabled : false,
      usInternationalEnabled: o.usInternationalEnabled !== undefined ? o.usInternationalEnabled : false,
      // Ensure fee columns exist
      price_fet: o.price_fet ?? 0,
      price_taxes: o.price_taxes ?? 0,
      price_extras_total: o.price_extras_total ?? 0,
    }
    
    // Recalculate fees if aircraft is selected
    if (normalizedOption.aircraft_id) {
      const fees = calculateFees(normalizedOption)
      return {
        ...normalizedOption,
        ...fees,
      }
    }
    
    return normalizedOption
  })

  // Only update if something changed (avoid re-renders)
  if (JSON.stringify(normalized) !== JSON.stringify(quote.options)) {
    onUpdate({ options: normalized })
  }
}, [quote, aircraftCache])


  // 🧮 Helper: renumber all options (Option 1, Option 2, etc.)
const renumberOptions = (options: QuoteOption[]): QuoteOption[] => {
  return options.map((opt, index) => ({
    ...opt,
    label: `Option ${index + 1}`,
  }))
}


// 🧠 Mark as initialized once quote options are loaded from DB
useEffect(() => {
  if (quote?.options && quote.options.length > 0 && !initialized) {
    setInitialized(true)
  }
}, [quote])

// 🛩️ Preload aircraft data from existing options
useEffect(() => {
  if (!quote?.options?.length) return
  
  console.log("🔍 Debug quote options:", quote.options)
  
  const aircraftData: Record<string, AircraftFull> = {}
  
  quote.options.forEach((option: any) => {
    console.log("🔍 Processing option:", {
      aircraft_id: option.aircraft_id,
      hasAircraftModel: !!option.aircraftModel,
      hasAircraftTail: !!option.aircraftTail,
      aircraftModel: option.aircraftModel,
      aircraftTail: option.aircraftTail
    })
    
    if (option.aircraft_id && option.aircraftModel && option.aircraftTail) {
      // Convert API aircraft data to AircraftFull format
      aircraftData[option.aircraft_id] = {
        aircraft_id: option.aircraft_id,
        tenant_id: option.aircraftTail.tenant_id || "",
        tail_number: option.aircraftTail.tailNumber || "",
        manufacturer_name: option.aircraftModel.manufacturer || "",
        model_name: option.aircraftModel.name || "",
        operator_name: option.aircraftTail.operator || option.aircraftTail.operator_id || "",
        primary_image_url: option.aircraftTail.images?.[0] || option.aircraftModel.images?.[0] || null,
        amenities: option.selectedAmenities?.map((a: any) => typeof a === 'string' ? a : a.name).filter(Boolean) || [],
        capacity_pax: option.aircraftTail.capacityOverride || option.aircraftTail.capacity_pax || option.aircraftModel.defaultCapacity || 8,
        range_nm: option.aircraftTail.rangeNmOverride || option.aircraftTail.range_nm || option.aircraftModel.defaultRangeNm || 2000,
        status: option.aircraftTail.status || "active",
        home_base: option.aircraftTail.homeBase || "",
        year_of_manufacture: option.aircraftTail.year || null,
        year_of_refurbish: option.aircraftTail.yearOfRefurbish || null,
        serial_number: option.aircraftTail.serialNumber || "",
        mtow_kg: option.aircraftTail.mtowKg || null,
        notes: option.aircraftTail.notes || "",
        meta: option.aircraftTail.meta || {},
        aircraft_images: option.aircraftTail.images || [],
      }
    } else if (option.aircraft_id && !aircraftCache[option.aircraft_id]) {
      // If option has aircraft_id but no aircraft data, it might be a newly added option
      // that hasn't been saved yet. We'll skip it for now and let the user select an aircraft.
      console.log("⚠️ Option has aircraft_id but no aircraft data (likely newly added):", {
        aircraft_id: option.aircraft_id,
        hasAircraftModel: !!option.aircraftModel,
        hasAircraftTail: !!option.aircraftTail
      })
    } else {
      console.log("⚠️ Missing aircraft data for option:", {
        aircraft_id: option.aircraft_id,
        hasAircraftModel: !!option.aircraftModel,
        hasAircraftTail: !!option.aircraftTail
      })
    }
  })
  
  if (Object.keys(aircraftData).length > 0) {
    console.log("🛩️ Preloading aircraft data:", aircraftData)
    setAircraftCache(aircraftData)
  } else {
    console.log("⚠️ No aircraft data found in options:", quote.options)
  }
}, [quote?.options])

// Listen for aircraft creation events to refresh cache
useEffect(() => {
  const handleAircraftDataUpdated = () => {
    // When a new aircraft is created, the combobox will refresh when opened
    // This event is mainly for other components, but we can use it to clear cache if needed
    console.log("🔄 Aircraft data updated event received")
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('aircraft-data-updated', handleAircraftDataUpdated)
    return () => {
      window.removeEventListener('aircraft-data-updated', handleAircraftDataUpdated)
    }
  }
}, [])

// Note: Aircraft data is already provided in the quote prop
// No need to fetch separately

  const handleAddOption = () => {
    const newOption: any = {
      id: crypto.randomUUID(),
      label: `Option ${options.length + 1}`,
      aircraft_id: null, // Use null instead of empty string to avoid UUID validation errors
      aircraft_tail_id: null,
      flight_hours: 0,
      cost_operator: 0,
      price_commission: 0,
      price_base: 0,
      price_fet: 0,
      price_taxes: 0,
      price_extras_total: 0,
      price_total: 0,
      fetEnabled: false, // FET disabled by default
      usDomesticEnabled: false, // US Domestic disabled by default
      usInternationalEnabled: false, // US International disabled by default
      selectedAmenities: [],
      notes: "",
      // Initialize empty aircraft data objects for consistency
      aircraftModel: null,
      aircraftTail: null,
    }
    onUpdate({ options: renumberOptions([...options, newOption]) })
  }

const handleUpdateOption = (id: string, updates: Partial<QuoteOption>) => {
  // Block only if we're hydrating pre-existing options from DB.
  if (!initialized && options.length > 0) return;

  if (
    !updates ||
    Object.keys(updates).length === 0 ||
    Object.values(updates).every((v) => v === undefined || v === null || v === "")
  ) {
    return;
  }

  onUpdate({
    options: options.map((o) => (o.id === id ? { ...o, ...updates } : o)),
  });
};

  const applyAircraftSelection = (
    optionId: string,
    aircraft: AircraftFull,
    opts?: { toastMessage?: string; skipToast?: boolean },
  ) => {
    if (!aircraft?.aircraft_id) return

    setAircraftCache((prev) => ({ ...prev, [aircraft.aircraft_id]: aircraft }))

    const aircraftImages = aircraft.aircraft_images || (aircraft.primary_image_url ? [aircraft.primary_image_url] : [])

    const aircraftModel = {
      id: aircraft.aircraft_id,
      name: aircraft.model_name || "",
      manufacturer: aircraft.manufacturer_name || "",
      defaultCapacity: aircraft.capacity_pax ?? null,
      defaultRangeNm: aircraft.range_nm ?? null,
      defaultSpeedKnots: null,
      images: aircraftImages,
    }

    const aircraftTail = {
      id: aircraft.aircraft_id,
      tailNumber: aircraft.tail_number || "",
      operator: aircraft.operator_name || "",
      operator_id: "",
      year: aircraft.year_of_manufacture || null,
      yearOfRefurbish: aircraft.year_of_refurbish || null,
      cruisingSpeed: null,
      rangeNm: aircraft.range_nm || null,
      amenities: aircraft.amenities || [],
      images: aircraftImages,
      capacityOverride: aircraft.capacity_pax || null,
      rangeNmOverride: aircraft.range_nm || null,
      speedKnotsOverride: null,
      status: aircraft.status || "ACTIVE",
      homeBase: aircraft.home_base || "",
      serialNumber: aircraft.serial_number || null,
      mtowKg: aircraft.mtow_kg || null,
    }

    // Get the current option to preserve existing values
    const currentOption = options.find((o) => o.id === optionId)
    const updatedOption = {
      ...currentOption,
      aircraft_id: aircraft.aircraft_id,
      aircraft_tail_id: aircraft.aircraft_id,
      selectedAmenities: aircraft.amenities || [],
      aircraftModel,
      aircraftTail,
      // Initialize fee switches if not already set (default to false)
      fetEnabled: currentOption?.fetEnabled !== undefined ? currentOption.fetEnabled : false,
      usDomesticEnabled: currentOption?.usDomesticEnabled !== undefined ? currentOption.usDomesticEnabled : false,
      usInternationalEnabled: currentOption?.usInternationalEnabled !== undefined ? currentOption.usInternationalEnabled : false,
    }
    
    // Recalculate fees based on the updated option
    const fees = calculateFees(updatedOption)
    
    handleUpdateOption(optionId, {
      ...updatedOption,
      ...fees,
    })

    if (!opts?.skipToast) {
      toast({
        title: "Aircraft Selected",
        description:
          opts?.toastMessage || `${aircraft.model_name || ""} (${aircraft.tail_number || ""}) selected.`,
      })
    }
  }

  const handleTailCreated = async (newTail: any) => {
    if (!newTail?.id || !pendingTailOptionId) return

    try {
      const res = await fetch(`/api/aircraft-full/${newTail.id}`)
      const json = await res.json()
      if (!res.ok || !json?.data) {
        throw new Error(json?.error || "Failed to load newly created aircraft.")
      }

      const aircraft: AircraftFull = json.data
      applyAircraftSelection(pendingTailOptionId, aircraft, {
        toastMessage: `${aircraft.model_name || ""} (${aircraft.tail_number || ""}) saved and selected.`,
      })
    } catch (error: any) {
      console.error("Error auto-selecting new tail:", error)
      toast({
        title: "Selection error",
        description: error?.message || "Unable to select the newly created aircraft.",
        variant: "destructive",
      })
    } finally {
      setPendingTailOptionId(null)
    }
  }



  const handleRemoveOption = (id: string) => {
  const remaining = options.filter((o) => o.id !== id)
  onUpdate({ options: renumberOptions(remaining) })
}

  const calculateOptionTotal = (option: any) => {
    // Use actual values from option (which may be manually edited)
    return (
      (option.cost_operator || 0) + 
      (option.price_commission || 0) + 
      (option.price_base || 0) + 
      (option.price_fet || 0) + 
      (option.price_extras_total || 0) + 
      (option.price_taxes || 0)
    )
  }

  const total = options.reduce((sum, o) => sum + calculateOptionTotal(o), 0)
  const isOptionsValid = options.length > 0

// 🧩 Navigate (save handled by parent)
const handleNext = () => {
  onNext()
}



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Aircraft Options
            </CardTitle>
            <CardDescription>Add and configure aircraft options for this quote.</CardDescription>
          </div>
          <Button onClick={handleAddOption}>
            <Plus className="mr-2 h-4 w-4" /> Add Option
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {options.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Plane className="h-10 w-10 mx-auto mb-3" />
            <p>No aircraft options added yet.</p>
            <Button className="mt-4" onClick={handleAddOption}>
              <Plus className="mr-2 h-4 w-4" /> Add First Option
            </Button>
          </div>
        )}

        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {options.map((option, idx) => {
            const optionTotal = calculateOptionTotal(option)
            return (
              <div key={option.id} className="p-4 border rounded-lg bg-card/50">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-base flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Aircraft Option #{idx + 1}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium">{formatCurrency(optionTotal)}</span>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveOption(option.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Two-column grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left column: Aircraft */}
                  <div className="space-y-3">
                    <Label>Aircraft Selection</Label>
                    <AircraftCombobox
                      value={option.aircraft_id || null}
                      onSelect={(a) => applyAircraftSelection(option.id, a)}
                      onClickAdd={() => {
                        setPendingTailOptionId(option.id)
                        setTailCreateDialogOpen(true)
                      }}
                    />

                 {option.aircraft_id && aircraftCache[option.aircraft_id] && (
  <AircraftSummaryCard
    aircraft={aircraftCache[option.aircraft_id]}
    onEdit={() => setEditTailId(option.aircraft_id!)}
  />
)}
                 {option.aircraft_id && !aircraftCache[option.aircraft_id] && (
  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
    <p className="text-sm text-yellow-800">
      ⚠️ Aircraft data not found. Please select a different aircraft.
    </p>
    <p className="text-xs text-yellow-700 mt-1">
      Debug: aircraft_id={option.aircraft_id}, cache keys={Object.keys(aircraftCache).join(', ')}
    </p>
  </div>
)}

                  </div>

                  {/* Right column: Pricing */}
                  <div className="space-y-3">
                    {/* Hours / Costs */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label>Total Hours</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={option.flight_hours ?? 0}
                          onChange={(e) =>
                            handleUpdateOption(option.id, {
                              flight_hours: parseFloat(e.target.value) || 0,
                            })
                          }
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Operator Cost</Label>
                        <Input
                          type="number"
                          value={option.cost_operator ?? 0}
                          onChange={(e) => {
                            const operatorCost = parseFloat(e.target.value) || 0
                            const updatedOption = { ...option, cost_operator: operatorCost }
                            const fees = calculateFees(updatedOption)
                            handleUpdateOption(option.id, {
                              cost_operator: operatorCost,
                              ...fees,
                            })
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Commission</Label>
                        <Input
                          type="number"
                          value={option.price_commission ?? 0}
                          onChange={(e) =>
                            handleUpdateOption(option.id, {
                              price_commission: parseFloat(e.target.value) || 0,
                            })
                          }
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-1.5">
                      <Label>Option Notes</Label>
                      <Textarea
                        placeholder="Special terms, conditions, or comments"
                        value={option.notes ?? ""}
                        onChange={(e) =>
                          handleUpdateOption(option.id, { notes: e.target.value })
                        }
                        className="min-h-[70px]"
                      />
                    </div>

                    {/* Fees & Taxes */}
                    <div className="pt-2 border-t">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="fees-taxes">
                          <AccordionTrigger className="text-sm font-medium">
                            Fees & Taxes
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pt-2">
                            <p className="text-xs text-muted-foreground mb-3">
                              Fees and taxes are pre-calculated but can be edited as needed. Toggle switches to enable/disable automatic calculation.
                            </p>

                            {/* Federal Excise Tax (FET) */}
                            <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-3 bg-muted/40 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium text-sm">Federal Excise Tax (FET)</Label>
                                  <Switch
                                    checked={option.fetEnabled === true}
                                    onCheckedChange={(enabled) => {
                                      const fees = calculateFees({ ...option, fetEnabled: enabled })
                                      handleUpdateOption(option.id, {
                                        fetEnabled: enabled,
                                        ...fees,
                                      })
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  7.5% of Operator Cost = {formatCurrency((option.cost_operator || 0) * 0.075)}
                                </p>
                              </div>
                              <div className="w-32">
                                <Label className="text-xs mb-1.5 block">Amount</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={option.price_fet ?? 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0
                                    handleUpdateOption(option.id, {
                                      price_fet: value,
                                    })
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  placeholder={formatCurrency((option.cost_operator || 0) * 0.075)}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            {/* US Domestic Segment Fee */}
                            <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-3 bg-muted/40 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium text-sm">US Domestic Segment Fee</Label>
                                  <Switch
                                    checked={option.usDomesticEnabled === true}
                                    onCheckedChange={(enabled) => {
                                      const fees = calculateFees({ ...option, usDomesticEnabled: enabled })
                                      handleUpdateOption(option.id, {
                                        usDomesticEnabled: enabled,
                                        ...fees,
                                      })
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  $5 × {getPassengerCount()} passengers = {formatCurrency(5 * getPassengerCount())}
                                </p>
                              </div>
                              <div className="w-32">
                                <Label className="text-xs mb-1.5 block">Amount</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={option.price_extras_total ?? 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0
                                    handleUpdateOption(option.id, {
                                      price_extras_total: value,
                                    })
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  placeholder={formatCurrency(5 * getPassengerCount())}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            {/* US International Head Tax */}
                            <div className="grid grid-cols-[1fr_auto] gap-4 items-center p-3 bg-muted/40 rounded-lg">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Label className="font-medium text-sm">US International Head Tax</Label>
                                  <Switch
                                    checked={option.usInternationalEnabled === true}
                                    onCheckedChange={(enabled) => {
                                      const fees = calculateFees({ ...option, usInternationalEnabled: enabled })
                                      handleUpdateOption(option.id, {
                                        usInternationalEnabled: enabled,
                                        ...fees,
                                      })
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  $22.40 × {getPassengerCount()} passengers = {formatCurrency(22.40 * getPassengerCount())}
                                </p>
                              </div>
                              <div className="w-32">
                                <Label className="text-xs mb-1.5 block">Amount</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={option.price_taxes ?? 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0
                                    handleUpdateOption(option.id, {
                                      price_taxes: value,
                                    })
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  placeholder={formatCurrency(22.40 * getPassengerCount())}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Totals */}
        {options.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t font-medium">
            <span>Total Quote:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Trip Legs
          </Button>
          <Button onClick={handleNext} disabled={!isOptionsValid}>
            Next: Services <ChevronRight className="ml-2 h-4 w-4" />
          </Button>


        </div>
      </CardContent>

      {/* Modals and Drawers */}
      <TailCreateDialog
        open={tailCreateDialogOpen}
        onOpenChange={(isOpen) => {
          setTailCreateDialogOpen(isOpen)
          if (!isOpen) {
            setPendingTailOptionId(null)
          }
        }}
        onCreated={handleTailCreated}
      />

      <TailCreateDialog
        tailId={editTailId || undefined}
        open={!!editTailId}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditTailId(null)
          }
        }}
        onCreated={async (tail) => {
          // After editing, close the dialog and show success message
          setEditTailId(null)
          toast({
            title: "Aircraft updated",
            description: "Aircraft tail has been updated successfully.",
          })
          // Note: The aircraft cache will be refreshed when the quote is reloaded
          // or the user can manually refresh the page to see the updated data
        }}
      />
    </Card>
  )
}
