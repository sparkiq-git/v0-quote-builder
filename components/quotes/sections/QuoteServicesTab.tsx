"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Settings, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { formatCurrency } from "@/lib/utils/format"
import type { Quote, Service } from "@/lib/types"

interface Props {
  quote: Quote
  onUpdate: (updates: Partial<Quote>) => void
  onNext: () => void
  onBack: () => void
}

export function QuoteServicesTab({ quote, onUpdate, onNext, onBack }: Props) {
  const { toast } = useToast()

  // 🧠 Local buffer for services to prevent re-render overwrites
  const [localServices, setLocalServices] = useState<Service[]>(quote.services || [])

  // Keep local buffer in sync if quote.services changes externally (e.g. new quote loaded)
  useEffect(() => {
    setLocalServices(quote.services || [])
  }, [quote.id]) // only reset when quote id changes, not on every autosave

  /* -------------------- ADD SERVICE -------------------- */
  const handleAddService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      amount: 0,
      qty: 1,
      taxable: true,
      item_id: null,
      notes: "",
      unit_cost: null,
    }
    const updated = [...localServices, newService]
    setLocalServices(updated)
    onUpdate({ services: updated }) // ✅ propagate to parent (autosave will handle it)
  }

  /* -------------------- UPDATE SERVICE -------------------- */
  const handleUpdateService = (id: string, updates: Partial<Service>) => {
    const updated = localServices.map((s) => (s.id === id ? { ...s, ...updates } : s))
    setLocalServices(updated)
    onUpdate({ services: updated }) // ✅ only update parent after state is stable
  }

  /* -------------------- REMOVE SERVICE -------------------- */
  const handleRemoveService = (id: string) => {
    const remaining = localServices.filter((s) => s.id !== id)
    setLocalServices(remaining)
    onUpdate({ services: remaining })
  }

  /* -------------------- TOTAL -------------------- */
  const total = localServices.reduce((sum, s) => sum + (s.amount || 0), 0)

  /* -------------------- VALIDATION -------------------- */
  const isServicesValid = true

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Additional Services
            </CardTitle>
            <CardDescription>Add optional services, extras, or fees to this quote.</CardDescription>
          </div>
          <Button type="button" onClick={handleAddService}>
            <Plus className="mr-2 h-4 w-4" /> Add Service
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* No services yet */}
        {localServices.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Settings className="h-10 w-10 mx-auto mb-3" />
            <p>No services added yet.</p>
            <Button type="button" className="mt-4" onClick={handleAddService}>
              <Plus className="mr-2 h-4 w-4" /> Add First Service
            </Button>
          </div>
        )}

        {/* List of services */}
        {localServices.map((service) => (
          <div key={service.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Service Item</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveService(service.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Service Name (via ItemCombobox) */}
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
                    toast({
                      title: "Service Added",
                      description: `${item.name} added to the quote.`,
                    })
                  }}
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={service.description || ""}
                  onChange={(e) =>
                    handleUpdateService(service.id, { description: e.target.value })
                  }
                  placeholder="Enter service description"
                />
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={service.amount ?? 0}
                  onChange={(e) =>
                    handleUpdateService(service.id, {
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Taxable toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={service.taxable ?? true}
                onCheckedChange={(checked) =>
                  handleUpdateService(service.id, { taxable: checked })
                }
              />
              <Label className="text-sm text-muted-foreground">Taxable</Label>
            </div>
          </div>
        ))}

        {/* Total */}
        {localServices.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t font-medium">
            <span>Total Services:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Aircraft
          </Button>
          <Button type="button" onClick={onNext} disabled={!isServicesValid}>
            Next: Summary <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
