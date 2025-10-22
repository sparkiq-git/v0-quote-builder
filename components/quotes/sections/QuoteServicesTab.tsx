"use client"

import { useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Wrench } from "lucide-react"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { useToast } from "@/hooks/use-toast"

export function QuoteServicesTab({ quote, onNext, onBack }: any) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState(quote.services || [])

  const handleAddService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        item_id: null,
        name: "",
        qty: 1,
        unit_price: 0,
        taxable: true,
        notes: "",
      },
    ])
  }

  const handleRemoveService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  const handleUpdate = (id: string, key: string, value: any) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    )
  }

  const subtotal = useMemo(
    () =>
      services.reduce((acc, s) => acc + (s.qty || 0) * (s.unit_price || 0), 0),
    [services]
  )

  const handleSaveAndNavigate = async (direction: "next" | "back") => {
    try {
      setSaving(true)

      const payload = {
        quote: {
          contact_id: quote.contact_id,
          contact_name: quote.contact_name,
          contact_email: quote.contact_email,
          contact_phone: quote.contact_phone,
          contact_company: quote.contact_company,
          valid_until: quote.valid_until,
          notes: quote.notes,
          title: quote.title,
          status: quote.status,
        },
        services,
      }

      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save services")

      toast({ title: "Services saved", description: "Quote services updated successfully." })
      direction === "next" ? onNext() : onBack()
    } catch (err: any) {
      toast({ title: "Error saving services", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Services
        </CardTitle>
        <CardDescription>Add services or products to this quote.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {services.map((s, i) => (
          <div key={s.id} className="border p-4 rounded-lg space-y-4 bg-background/50">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Service {i + 1}</h4>
              <Button variant="outline" size="sm" onClick={() => handleRemoveService(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="col-span-2">
                <Label>Item</Label>
                <ItemCombobox
                  tenantId={quote.tenant_id}
                  value={s.item_id}
                  onSelect={(item) => {
                    handleUpdate(s.id, "item_id", item.id)
                    handleUpdate(s.id, "name", item.name)
                    handleUpdate(s.id, "unit_price", item.default_unit_price || 0)
                    handleUpdate(s.id, "taxable", item.default_taxable ?? true)
                    handleUpdate(s.id, "notes", item.default_notes || "")
                  }}
                />
              </div>

              <div>
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={s.qty || 1}
                  onChange={(e) =>
                    handleUpdate(s.id, "qty", parseInt(e.target.value) || 1)
                  }
                />
              </div>

              <div>
                <Label>Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={s.unit_price || 0}
                  onChange={(e) =>
                    handleUpdate(
                      s.id,
                      "unit_price",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div>
                <Label>Subtotal</Label>
                <Input
                  readOnly
                  value={((s.qty || 0) * (s.unit_price || 0)).toFixed(2)}
                  className="bg-muted"
                />
              </div>

              <div className="flex items-end">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.taxable}
                    onChange={(e) =>
                      handleUpdate(s.id, "taxable", e.target.checked)
                    }
                  />
                  Taxable
                </Label>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Additional details for this service..."
                value={s.notes || ""}
                onChange={(e) => handleUpdate(s.id, "notes", e.target.value)}
              />
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={handleAddService}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>

        <div className="pt-6 border-t text-right">
          <p className="text-sm text-muted-foreground">
            Subtotal:{" "}
            <span className="font-semibold text-foreground">
              ${subtotal.toFixed(2)}
            </span>
          </p>
        </div>

        <Separator />

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => handleSaveAndNavigate("back")} disabled={saving}>
            Back
          </Button>
          <Button onClick={() => handleSaveAndNavigate("next")} disabled={saving}>
            {saving ? "Saving..." : "Next"} →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
