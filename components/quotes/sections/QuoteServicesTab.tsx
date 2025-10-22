"use client"

import { useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Cog } from "lucide-react"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

export function QuoteServicesTab({ quote, onNext, onBack }: any) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState(
    quote.services?.length
      ? quote.services
      : [
          {
            id: crypto.randomUUID(),
            item_id: null,
            description: "",
            amount: 0,
            taxable: false,
          },
        ]
  )

  /* ---------------- Handlers ---------------- */
  const handleAddService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        item_id: null,
        description: "",
        amount: 0,
        taxable: false,
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

  const total = useMemo(
    () => services.reduce((acc, s) => acc + (Number(s.amount) || 0), 0),
    [services]
  )

  const handleSaveAndNavigate = async (direction: "next" | "back") => {
    try {
      setSaving(true)

      if (services.some((s) => !s.item_id)) {
        toast({
          title: "Missing information",
          description: "Please select a service item before continuing.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      const payload = {
        quote: {
          title: quote.title,
          contact_id: quote.contact_id,
          status: quote.status,
          notes: quote.notes,
          valid_until: quote.valid_until,
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
        {services.map((s) => (
          <div
            key={s.id}
            className="border rounded-lg p-4 bg-background/50 relative"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="font-medium text-sm">Service Item</div>
              {services.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveService(s.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Service Name */}
              <div>
                <Label className="text-sm mb-1 block">Service Name</Label>
                <ItemCombobox
                  tenantId={quote.tenant_id}
                  value={s.item_id}
                  onSelect={(item) => handleUpdate(s.id, "item_id", item.id)}
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

              {/* Amount */}
              <div>
                <Label className="text-sm mb-1 block">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={s.amount}
                  onChange={(e) =>
                    handleUpdate(s.id, "amount", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {/* Taxable toggle */}
            <div className="flex items-center gap-2 mt-4">
              <Switch
                checked={s.taxable}
                onCheckedChange={(val) => handleUpdate(s.id, "taxable", val)}
              />
              <Label>Taxable</Label>
            </div>
          </div>
        ))}

        <Button
          variant="default"
          className="w-fit ml-auto flex items-center gap-2"
          onClick={handleAddService}
        >
          <Plus className="h-4 w-4" /> Add Service
        </Button>

        {/* Total Section */}
        <div className="border-t pt-4 text-right text-sm font-medium">
          Total Services:{" "}
          <span className="text-base font-semibold">${total.toFixed(2)}</span>
        </div>

        <Separator />

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => handleSaveAndNavigate("back")}
            disabled={saving}
          >
            ← Back: Aircraft
          </Button>
          <Button
            onClick={() => handleSaveAndNavigate("next")}
            disabled={saving}
          >
            {saving ? "Saving..." : "Next: Summary →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
