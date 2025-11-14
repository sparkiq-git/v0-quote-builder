"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import type { AircraftType } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"

export function AddAircraftDialog() {
  const { dispatch } = useMockStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: "",
    category: "",
    capacity: 0,
    range: 0,
    hourlyRate: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    const newAircraft: AircraftType = {
      id: `aircraft-${Date.now()}`,
      name: form.name,
      category: form.category,
      capacity: form.capacity,
      range: form.range,
      hourlyRate: form.hourlyRate,
      images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    }

    dispatch({
      type: "ADD_AIRCRAFT_TYPE",
      payload: newAircraft,
    })

    toast({
      title: "Aircraft added",
      description: "The new aircraft type has been added to your catalog.",
    })

    setForm({
      name: "",
      category: "",
      capacity: 0,
      range: 0,
      hourlyRate: 0,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
        <DialogHeader>
          <DialogTitle>Add New Aircraft Type</DialogTitle>
          <DialogDescription>Add a new aircraft type to your catalog for use in quotes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Aircraft Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Citation CJ3+"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Light Jet">Light Jet</SelectItem>
                <SelectItem value="Mid-Size Jet">Mid-Size Jet</SelectItem>
                <SelectItem value="Heavy Jet">Heavy Jet</SelectItem>
                <SelectItem value="Turboprop">Turboprop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number.parseInt(e.target.value) || 0 })}
                placeholder="8"
                min="1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="range">Range (nm)</Label>
              <Input
                id="range"
                type="number"
                value={form.range}
                onChange={(e) => setForm({ ...form, range: Number.parseInt(e.target.value) || 0 })}
                placeholder="2000"
                min="0"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: Number.parseFloat(e.target.value) || 0 })}
              placeholder="3500"
              min="0"
              step="50"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Aircraft</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
