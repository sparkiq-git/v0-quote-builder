"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Cog } from "lucide-react"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

interface Props {
  quote: any
  onUpdate: (updates: any) => void
  onNext: () => void
  onBack: () => void
}

export function QuoteServicesTab({ quote, onUpdate, onNext, onBack }: Props) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState(
    Array.isArray(quote.services) ? quote.services : []
  )

  /* ---------------- Handlers ---------------- */

  const handleAddService = () => {
    const newService = {
      id: crypto.randomUUID(),
      item_id: null,
      description: "",
      amount: 0,
      qty: 1,
      taxable: false,
    }
    const updatedServices = [...services, newService]
    setServices(updatedServices)
    onUpdate({ services: updatedServices })
  }

  const handleRemoveService = (id: string) => {
    const updatedServices = services.filter((s) => s.id !== id)
    setServices(updatedServices)
    onUpdate({ services: updatedServices })
  }

  const handleUpdate = (id: string, key: string, value: any) => {
    const updatedServices = services.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    setServices(updatedServices)
    onUpdate({ services: updatedServices })
  }

  const total = useMemo(
    () => services.reduce((acc, s) => acc + (Number(s.amount) || 0) * (Number(s.qty) || 1), 0),
    [services]
  )

  const handleSaveAndNavigate = (direction: "next" | "back") => {
    direction === "next" ? onNext() : onBack()
  }

  /* ---------------- UI ---------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Additional Services
        </CardTitle>
        <CardDescription>
          Add optional services, extras, or fees to this quote.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* If no services, show Add Service button */}
        {services.length === 0 ? (
          <div className="flex justify-center py-16">
            <Button variant="outline" onClick={handleAddService}>
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Button>
          </div>
        ) : (
          <>
            {services.map((s) => (
              <div
                key={s.id}
                className="border rounded-lg p-4 bg-background/50 relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium text-sm">Service Item</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveService(s.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Service Name */}
                  <div>
                    <Label className="text-sm mb-1 block">Service Name</Label>
                    <ItemCombobox
                      tenantId={quote.tenant_id}
                      value={s.item_id}
                      onSelect={(item) =>
                        handleUpdate(s.id, "item_id", item.id)
                      }
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm mb-1 block">Description</Label>
                    <Input
                      placeholder="Enter service description"
                      value={s.description}
                      onChange={(e) =>
                        handleUpdate(s.id, "description", e.target.value)
                      }
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label className="text-sm mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={s.qty || 1}
                      onChange={(e) =>
                        handleUpdate(
                          s.id,
                          "qty",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <Label className="text-sm mb-1 block">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={s.amount}
                      onChange={(e) =>
                        handleUpdate(
                          s.id,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* Taxable toggle */}
                <div className="flex items-center gap-2 mt-4">
                  <Switch
                    checked={s.taxable}
                    onCheckedChange={(val) =>
                      handleUpdate(s.id, "taxable", val)
                    }
                  />
                  <Label>Taxable</Label>
                </div>
              </div>
            ))}

            {/* Add Service Button */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleAddService}>
                <Plus className="h-4 w-4 mr-2" /> Add Service
              </Button>
            </div>
          </>
        )}

        {/* Total Section */}
        <div className="border-t pt-4 text-right text-sm font-medium">
          Total Services:{" "}
          <span className="text-base font-semibold">
            ${total.toFixed(2)}
          </span>
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => handleSaveAndNavigate("back")}
          >
            ← Back: Aircraft
          </Button>
          <Button
            onClick={() => handleSaveAndNavigate("next")}
          >
            Next: Summary →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
