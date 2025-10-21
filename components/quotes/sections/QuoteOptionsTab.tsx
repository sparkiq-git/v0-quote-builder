"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plane, Plus, Trash2, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AircraftCombobox } from "@/components/ui/aircraft-combobox"
import { formatCurrency } from "@/lib/utils/format"
import type { Quote, QuoteOption, QuoteFee, AircraftFull } from "@/lib/types"
import { AircraftCreateModal } from "@/components/aircraft/AircraftCreateModal"
import { AircraftEditDrawer } from "@/components/aircraft/AircraftEditDrawer"
import { AircraftSummaryCard } from "@/components/aircraft/AircraftSummaryCard"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onNext: () => void
  onBack: () => void
}

export function QuoteOptionsTab({ quote, onUpdate, onNext, onBack }: Props) {
  const { toast } = useToast()

  // ✅ Defensive default: always use array
  const options = Array.isArray(quote?.options) ? quote.options : []

  const handleAddOption = () => {
    const newOption: QuoteOption = {
      id: crypto.randomUUID(),
      aircraftModelId: "",
      totalHours: 0,
      operatorCost: 0,
      commission: 0,
      notes: "", // ✅ default empty notes
      fees: [
        { id: crypto.randomUUID(), name: "US Domestic Segment Fee", amount: 4.3 },
        { id: crypto.randomUUID(), name: "US International Head Tax", amount: 19.1 },
        { id: crypto.randomUUID(), name: "Federal Excise Tax (FET)", amount: 0 },
      ],
      feesEnabled: false,
      selectedAmenities: [],
    }

    onUpdate({ options: [...options, newOption] })
  }

  const handleUpdateOption = (id: string, updates: Partial<QuoteOption>) => {
    onUpdate({
      options: options.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })
  }

  const handleRemoveOption = (id: string) => {
    onUpdate({ options: options.filter((o) => o.id !== id) })
  }

  const calculateOptionTotal = (option: QuoteOption) => {
    const feeTotal = option.feesEnabled
      ? (option.fees || []).reduce((sum, f) => sum + (f.amount || 0), 0)
      : 0
    return option.operatorCost + option.commission + feeTotal
  }

  const total = options.reduce((sum, o) => sum + calculateOptionTotal(o), 0)
  const isOptionsValid = options.length > 0

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

        {options.map((option) => (
          <div key={option.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Aircraft Option</h4>
              <Button variant="outline" size="sm" onClick={() => handleRemoveOption(option.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Aircraft selection */}
            <div className="grid gap-2">
              <Label>Aircraft Selection</Label>
              <AircraftCombobox
                value={option.aircraftModelId || null}
                onSelect={(a) => {
                  handleUpdateOption(option.id, {
                    aircraftModelId: a.aircraft_id,
                    aircraftTailId: a.aircraft_id,
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
              />
            </div>

            {/* Option cost inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Total Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={option.totalHours}
                  onChange={(e) =>
                    handleUpdateOption(option.id, { totalHours: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Operator Cost</Label>
                <Input
                  type="number"
                  value={option.operatorCost}
                  onChange={(e) =>
                    handleUpdateOption(option.id, { operatorCost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Commission</Label>
                <Input
                  type="number"
                  value={option.commission}
                  onChange={(e) =>
                    handleUpdateOption(option.id, { commission: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* ✅ Notes Field */}
            <div className="grid gap-2">
              <Label>Option Notes</Label>
              <Textarea
                placeholder="Enter notes about this aircraft option (e.g. special terms, conditions, or comments)"
                value={option.notes || ""}
                onChange={(e) => handleUpdateOption(option.id, { notes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Fees toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="font-medium">Aircraft Fees & Taxes</Label>
                <p className="text-sm text-muted-foreground">
                  Enable to apply applicable fees and taxes.
                </p>
              </div>
              <Switch
                checked={option.feesEnabled}
                onCheckedChange={(enabled) => {
                  handleUpdateOption(option.id, { feesEnabled: enabled })
                }}
              />
            </div>

            {option.feesEnabled && (
              <div className="space-y-3 pt-2">
                {option.fees.map((fee) => (
                  <div key={fee.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
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
                      value={fee.amount}
                      onChange={(e) =>
                        handleUpdateOption(option.id, {
                          fees: option.fees.map((f) =>
                            f.id === fee.id
                              ? { ...f, amount: parseFloat(e.target.value) || 0 }
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
                    const newFee: QuoteFee = {
                      id: crypto.randomUUID(),
                      name: "Custom Fee",
                      amount: 0,
                    }
                    handleUpdateOption(option.id, { fees: [...option.fees, newFee] })
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Fee
                </Button>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t font-medium">
              <span>Option Total:</span>
              <span>{formatCurrency(calculateOptionTotal(option))}</span>
            </div>
          </div>
        ))}

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
          <Button onClick={onNext} disabled={!isOptionsValid}>
            Next: Services <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
