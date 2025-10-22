"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Trash2, Plus, Wrench } from "lucide-react"
import { ItemCombobox } from "@/components/ui/item-combobox"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

export function QuoteServicesTab({ quote, onNext, onBack }: any) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState(
    quote.services && quote.services.length
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

  /* ---------------- Add/Remove/Update ---------------- */
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

  /* ---------------- Save and Navigate ---------------- */
  const handleSaveAndNavigate = async (direction: "next" | "back") => {
    try {
      setSaving(true)

      // validate at least one service
      if (!services.length || services.some((s) => !s.item_id)) {
        toast({
          title: "Missing information",
          description: "Please select at least one service item before continuing.",
          variant: "destructive",
        })
        setSaving(false)
        return
      }

      const payload = {
        quote: {
          title: quote.title,
          status: quote.status,
          notes: quote.notes,
          contact_id: quote.contact_id,
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

      toast({
        title: "Services saved",
        description: "Quote services updated successfully.",
      })

      direction === "next" ? onNext() : onBack()
    } catch (err: any) {
      toast({
        title: "Error saving services",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Service Items
        </CardTitle>
        <CardDescription>Select and configure service items for this quote.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {services.map((s, i) => (
          <div
            key={s.id}
            className="flex flex-col md:flex-row items-start md:items-center gap-4 border p-4 rounded-lg bg-background/50"
          >
            <div className="flex-1">
              <Label>Service Name</Label>
              <ItemCombobox
                tenantId={quote.tenant_id}
                value={s.item_id}
                onSelect={(item) => handleUpdate(s.id, "item_id", item.id)}
              />
            </div>

            <div className="flex-1">
              <Label>Description</Label>
              <Input
                placeholder="Enter service description"
                value={s.description || ""}
                onChange={(e) =>
                  handleUpdate(s.id, "description", e.target.value)
                }
              />
            </div>

            <div className="w-[120px]">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={s.amount || 0}
                onChange={(e) =>
                  handleUpdate(s.id, "amount", parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={s.taxable}
                onCheckedChange={(val) => handleUpdate(s.id, "taxable", val)}
              />
              <Label>Taxable</Label>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveService(s.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={handleAddService}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>

        <Separator />

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => handleSaveAndNavigate("back")}
            disabled={saving}
          >
            Back
          </Button>
          <Button
            onClick={() => handleSaveAndNavigate("next")}
            disabled={saving}
          >
            {saving ? "Saving..." : "Next"} →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
