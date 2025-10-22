"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plane, Plus, Trash2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AircraftCombobox } from "@/components/ui/aircraft-combobox"
import { AircraftCreateModal } from "@/components/aircraft/AircraftCreateModal"
import { AircraftEditDrawer } from "@/components/aircraft/AircraftEditDrawer"
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpenFor, setEditOpenFor] = useState<string | null>(null)
  const [aircraftCache, setAircraftCache] = useState<Record<string, AircraftFull>>({})
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // 🧩 Normalize options after quote is loaded (ensures no undefined fees)
useEffect(() => {
  if (!quote?.options) return

  const normalized = quote.options.map((o) => ({
    ...o,
    fees: Array.isArray(o.fees) ? o.fees : [],
    feesEnabled: o.feesEnabled ?? false,
  }))

  // Only update if something changed (avoid re-renders)
  if (JSON.stringify(normalized) !== JSON.stringify(quote.options)) {
    onUpdate({ options: normalized })
  }
}, [quote])


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




useEffect(() => {
  const fetchAircraftForOptions = async () => {
    // Get all aircraft_ids from quote options
    const ids = options
      .map((o) => o.aircraft_id)
      .filter((id): id is string => !!id)

    if (ids.length === 0) return

    // Fetch all aircraft for tenant
    const res = await fetch("/api/aircraft-full")
    const json = await res.json()
    if (!res.ok) return

    // Build dictionary by aircraft_id
    const byId = Object.fromEntries(
      json.data
        .filter((a) => ids.includes(a.aircraft_id))
        .map((a) => [a.aircraft_id, a])
    )

    setAircraftCache((prev) => ({ ...prev, ...byId }))
  }

  fetchAircraftForOptions()
}, [options])

  const handleAddOption = () => {
    const newOption: QuoteOption = {
  id: crypto.randomUUID(),
  label: `Option ${options.length + 1}`,
  aircraft_id: "",
  flight_hours: 0,
  cost_operator: 0,
  price_commission: 0,
  price_base: 0,
  price_total: 0,
  notes: "",
      fees: [
        { id: crypto.randomUUID(), name: "US Domestic Segment Fee", amount: 0 },
        { id: crypto.randomUUID(), name: "US International Head Tax", amount: 0 },
        { id: crypto.randomUUID(), name: "Federal Excise Tax (FET)", amount: 0 },
      ],
      feesEnabled: false,
      selectedAmenities: [],
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



  const handleRemoveOption = (id: string) => {
  const remaining = options.filter((o) => o.id !== id)
  onUpdate({ options: renumberOptions(remaining) })
}

  const calculateOptionTotal = (option: QuoteOption) => {
    const feeTotal = option.feesEnabled
      ? (option.fees || []).reduce((sum, f) => sum + (f.amount || 0), 0)
      : 0
    return option.cost_operator + option.price_commission + feeTotal
  }

  const total = options.reduce((sum, o) => sum + calculateOptionTotal(o), 0)
  const isOptionsValid = options.length > 0

// 🧩 Save quote options before moving to next tab
const handleNext = async () => {
  try {
    setSaving(true)
    const res = await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote, options }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed to save quote options")

    toast({ title: "Quote Saved", description: "Aircraft options saved successfully." })
    onNext()
  } catch (err: any) {
    toast({ title: "Error saving", description: err.message, variant: "destructive" })
  } finally {
    setSaving(false)
  }
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
                      onSelect={(a) => {
                        setAircraftCache((prev) => ({ ...prev, [a.aircraft_id]: a }))
                        handleUpdateOption(option.id, {
                          aircraft_id: a.aircraft_id,
                          aircraft_tail_number: a.tail_number,
                          aircraft_model: a.model_name,
                          aircraft_manufacturer: a.manufacturer_name,
                          aircraft_capacity: a.capacity_pax,
                          aircraft_range: a.range_nm,
                          selectedAmenities: a.amenities || [],
                        })
                        toast({
                          title: "Aircraft Selected",
                          description: `${a.model_name || ""} (${a.tail_number || ""}) selected.`,
                        })
                      }}
                      onClickAdd={() => setCreateOpen(true)}
                    />

                 {option.aircraft_id && aircraftCache[option.aircraft_id] && (
  <AircraftSummaryCard
    aircraft={aircraftCache[option.aircraft_id]}
    onEdit={() => setEditOpenFor(option.aircraft_id!)}
  />
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
/>
                      </div>
                      <div className="grid gap-1.5">
                        <Label>Operator Cost</Label>
                        <Input
                          type="number"
                          value={option.cost_operator ?? 0}
                          onChange={(e) =>
                            handleUpdateOption(option.id, {
                              cost_operator: parseFloat(e.target.value) || 0,
                            })
                          }
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

                    {/* Fees */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Label className="font-medium">Fees & Taxes</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable to apply applicable fees and taxes.
                          </p>
                        </div>
                        <Switch
                          checked={option.feesEnabled}
                          onCheckedChange={(enabled) =>
                            handleUpdateOption(option.id, { feesEnabled: enabled })
                          }
                        />
                      </div>

                      {option.feesEnabled && (
                        <div className="space-y-2">
                          {(option.fees ?? []).map((fee) => (
                            <div
                              key={fee.id}
                              className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg"
                            >
                              <Input
                                value={fee.name}
                                onChange={(e) =>
                                  handleUpdateOption(option.id, {
                                    fees: option.fees.map((f) =>
                                      f.id === fee.id ? { ...f, name: e.target.value } : f
                                    ),
                                  })
                                }
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={fee.amount ?? 0}
                                onChange={(e) =>
                                  handleUpdateOption(option.id, {
                                    fees: option.fees.map((f) =>
                                      f.id === fee.id
                                        ? {
                                            ...f,
                                            amount: parseFloat(e.target.value) || 0,
                                          }
                                        : f
                                    ),
                                  })
                                }
                                className="w-24"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateOption(option.id, {
                                    fees: option.fees.filter((f) => f.id !== fee.id),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
  const newFee: QuoteFee = { id: crypto.randomUUID(), name: "Custom Fee", amount: 0 }
  handleUpdateOption(option.id, { fees: [...(option.fees ?? []), newFee] })
}}

                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Fee
                          </Button>
                        </div>
                      )}
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
<Button onClick={handleNext} disabled={!isOptionsValid || saving}>
  {saving ? "Saving..." : "Next: Services"} <ChevronRight className="ml-2 h-4 w-4" />
</Button>


        </div>
      </CardContent>

      {/* Modals and Drawers */}
      <AircraftCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          const normalized: AircraftFull = {
            aircraft_id: created.id,
            tenant_id: created.tenant_id,
            tail_number: created.tail_number,
            manufacturer_name: null,
            model_name: null,
            operator_name: null,
            primary_image_url: null,
            amenities: [],
            capacity_pax: created.capacity_pax,
            range_nm: created.range_nm,
            status: created.status,
            home_base: created.home_base,
            year_of_manufacture: created.year_of_manufacture,
            year_of_refurbish: created.year_of_refurbish,
            serial_number: created.serial_number,
            mtow_kg: created.mtow_kg,
            notes: created.notes,
            meta: created.meta,
          }
          setAircraftCache((prev) => ({ ...prev, [normalized.aircraft_id]: normalized }))
        }}
      />

      <AircraftEditDrawer
        aircraftId={editOpenFor ?? ""}
        open={!!editOpenFor}
        onOpenChange={(v) => !v && setEditOpenFor(null)}
        initial={(() => {
          const a = editOpenFor ? aircraftCache[editOpenFor] : undefined
          if (!a) return undefined
          return {
            tail_number: a.tail_number,
            home_base: a.home_base ?? null,
            capacity_pax: a.capacity_pax ?? null,
            range_nm: a.range_nm ?? null,
            notes: a.notes ?? null,
          }
        })()}
        onUpdated={(updated) => {
          setAircraftCache((prev) => ({
            ...prev,
            [updated.id]: {
              ...(prev[updated.id] || {}),
              aircraft_id: updated.id,
              tenant_id: updated.tenant_id,
              tail_number: updated.tail_number,
              capacity_pax: updated.capacity_pax,
              range_nm: updated.range_nm,
              status: updated.status,
              home_base: updated.home_base,
              notes: updated.notes,
            },
          }))
        }}
        onDeleted={() => {
          if (!editOpenFor) return
          setAircraftCache((prev) => {
            const copy = { ...prev }
            delete copy[editOpenFor]
            return copy
          })
          setEditOpenFor(null)
        }}
      />
    </Card>
  )
}
