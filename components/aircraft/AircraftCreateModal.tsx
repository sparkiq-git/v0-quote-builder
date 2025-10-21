"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export type AircraftCreatePayload = {
  tail_number: string
  type_rating_id?: string | null
  model_id?: string | null
  manufacturer_id?: string | null
  operator_id?: string | null
  home_base?: string | null
  capacity_pax?: number | null
  range_nm?: number | null
  notes?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (aircraft: any) => void // returns the created record from /api/aircraft
}

export function AircraftCreateModal({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AircraftCreatePayload>({ tail_number: "" })

  const set = (k: keyof AircraftCreatePayload, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.tail_number) {
      toast({ title: "Tail number is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create aircraft")
      toast({ title: "Aircraft created", description: `Tail ${json.data.tail_number} added.` })
      onCreated(json.data)
      onOpenChange(false)
    } catch (e:any) {
      toast({ title: "Error creating aircraft", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Aircraft</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Tail Number *</Label>
            <Input value={form.tail_number} onChange={(e)=>set("tail_number", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Manufacturer ID</Label>
              <Input value={form.manufacturer_id ?? ""} onChange={(e)=>set("manufacturer_id", e.target.value || null)} placeholder="uuid or leave blank" />
            </div>
            <div className="grid gap-1.5">
              <Label>Model ID</Label>
              <Input value={form.model_id ?? ""} onChange={(e)=>set("model_id", e.target.value || null)} placeholder="uuid or leave blank" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Operator ID</Label>
              <Input value={form.operator_id ?? ""} onChange={(e)=>set("operator_id", e.target.value || null)} placeholder="uuid or leave blank" />
            </div>
            <div className="grid gap-1.5">
              <Label>Type Rating ID *</Label>
              <Input value={form.type_rating_id ?? ""} onChange={(e)=>set("type_rating_id", e.target.value || null)} placeholder="uuid" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Capacity (pax)</Label>
              <Input type="number" value={form.capacity_pax ?? ""} onChange={(e)=>set("capacity_pax", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Range (nm)</Label>
              <Input type="number" value={form.range_nm ?? ""} onChange={(e)=>set("range_nm", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Home Base</Label>
              <Input value={form.home_base ?? ""} onChange={(e)=>set("home_base", e.target.value || null)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ""} onChange={(e)=>set("notes", e.target.value || null)} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save Aircraft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
