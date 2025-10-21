"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface Props {
  aircraftId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdated: (aircraft: any) => void
  onDeleted?: () => void
  initial?: Partial<{
    tail_number: string
    manufacturer_id: string | null
    model_id: string | null
    operator_id: string | null
    home_base: string | null
    capacity_pax: number | null
    range_nm: number | null
    notes: string | null
    type_rating_id: string | null
  }>
}

export function AircraftEditDrawer({ aircraftId, open, onOpenChange, onUpdated, onDeleted, initial }: Props) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...initial })
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/aircraft/${aircraftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to update aircraft")
      toast({ title: "Aircraft updated", description: `Tail ${json.data.tail_number} saved.` })
      onUpdated(json.data)
      onOpenChange(false)
    } catch (e:any) {
      toast({ title: "Error updating aircraft", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm("Delete this aircraft? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/aircraft/${aircraftId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to delete aircraft")
      toast({ title: "Aircraft deleted" })
      onDeleted?.()
      onOpenChange(false)
    } catch (e:any) {
      toast({ title: "Error deleting aircraft", description: e.message, variant: "destructive" })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit Aircraft</SheetTitle>
        </SheetHeader>

        <div className="grid gap-3 py-4">
          <div className="grid gap-1.5">
            <Label>Tail Number</Label>
            <Input value={form.tail_number ?? ""} onChange={(e)=>set("tail_number", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Manufacturer ID</Label>
              <Input value={form.manufacturer_id ?? ""} onChange={(e)=>set("manufacturer_id", e.target.value || null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Model ID</Label>
              <Input value={form.model_id ?? ""} onChange={(e)=>set("model_id", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Operator ID</Label>
              <Input value={form.operator_id ?? ""} onChange={(e)=>set("operator_id", e.target.value || null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Type Rating ID</Label>
              <Input value={form.type_rating_id ?? ""} onChange={(e)=>set("type_rating_id", e.target.value || null)} />
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

        <SheetFooter className="gap-2">
          <Button variant="destructive" onClick={remove}>Delete</Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
