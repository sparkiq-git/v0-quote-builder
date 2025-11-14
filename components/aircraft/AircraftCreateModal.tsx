"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"
import { useOperators } from "@/hooks/use-operators"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const { operators, loading: operatorsLoading, createOperator } = useOperators()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AircraftCreatePayload>({ tail_number: "" })
  const [operatorComboOpen, setOperatorComboOpen] = useState(false)
  const [createOperatorDialogOpen, setCreateOperatorDialogOpen] = useState(false)
  const [newOperator, setNewOperator] = useState({ name: "", icao_code: "", iata_code: "" })
  const [creatingOperator, setCreatingOperator] = useState(false)

  const set = (k: keyof AircraftCreatePayload, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleOperatorSelect = (operatorId: string) => {
    set("operator_id", operatorId || null)
    setOperatorComboOpen(false)
  }

  const handleCreateOperator = async () => {
    if (!newOperator.name.trim()) {
      toast({ title: "Operator name is required", variant: "destructive" })
      return
    }

    setCreatingOperator(true)
    try {
      const result = await createOperator({
        name: newOperator.name.trim(),
        icao_code: newOperator.icao_code.trim() || null,
        iata_code: newOperator.iata_code.trim() || null,
      })

      if (result.success && result.data) {
        toast({ title: "Operator created", description: `${result.data.name} has been added.` })
        set("operator_id", result.data.id)
        setNewOperator({ name: "", icao_code: "", iata_code: "" })
        setCreateOperatorDialogOpen(false)
      } else {
        toast({ title: "Error", description: result.error || "Failed to create operator", variant: "destructive" })
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create operator", variant: "destructive" })
    } finally {
      setCreatingOperator(false)
    }
  }

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
      handleOpenChange(false)
    } catch (e:any) {
      toast({ title: "Error creating aircraft", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Reset form when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setForm({ tail_number: "" })
      setNewOperator({ name: "", icao_code: "", iata_code: "" })
      setOperatorComboOpen(false)
      setCreateOperatorDialogOpen(false)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
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
              <div className="flex items-center justify-between">
                <Label>Operator</Label>
                <Dialog open={createOperatorDialogOpen} onOpenChange={setCreateOperatorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-7">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-full md:max-w-md overflow-y-auto max-h-[100vh]">
                    <DialogHeader>
                      <DialogTitle>Create Operator</DialogTitle>
                      <DialogDescription>Add a new operator to your fleet</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="operator-name">Name *</Label>
                        <Input
                          id="operator-name"
                          value={newOperator.name}
                          onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                          placeholder="e.g., NetJets"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="operator-icao">ICAO Code</Label>
                          <Input
                            id="operator-icao"
                            value={newOperator.icao_code}
                            onChange={(e) => setNewOperator({ ...newOperator, icao_code: e.target.value })}
                            placeholder="e.g., NJA"
                            maxLength={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="operator-iata">IATA Code</Label>
                          <Input
                            id="operator-iata"
                            value={newOperator.iata_code}
                            onChange={(e) => setNewOperator({ ...newOperator, iata_code: e.target.value })}
                            placeholder="e.g., 1I"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setCreateOperatorDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateOperator} disabled={creatingOperator || !newOperator.name.trim()}>
                        {creatingOperator ? "Creating..." : "Create Operator"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Popover open={operatorComboOpen} onOpenChange={setOperatorComboOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={operatorComboOpen}
                    className="w-full justify-between bg-transparent"
                    disabled={operatorsLoading}
                  >
                    {form.operator_id
                      ? operators.find((op) => op.id === form.operator_id)?.name || "Select operator..."
                      : "Select operator..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search operators..." />
                    <CommandList>
                      <CommandEmpty>No operators found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="" onSelect={() => handleOperatorSelect("")}>
                          <Check
                            className={cn("mr-2 h-4 w-4", !form.operator_id ? "opacity-100" : "opacity-0")}
                          />
                          <span>No operator</span>
                        </CommandItem>
                        {operators.map((operator) => (
                          <CommandItem
                            key={operator.id}
                            value={operator.name}
                            onSelect={() => handleOperatorSelect(operator.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.operator_id === operator.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{operator.name}</span>
                              {(operator.icao_code || operator.iata_code) && (
                                <span className="text-sm text-muted-foreground">
                                  {operator.icao_code && operator.iata_code
                                    ? `${operator.icao_code} / ${operator.iata_code}`
                                    : operator.icao_code || operator.iata_code}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label>Type Rating ID *</Label>
              <Input value={form.type_rating_id ?? ""} onChange={(e)=>set("type_rating_id", e.target.value || null)} placeholder="uuid" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Capacity (pax)</Label>
              <Input type="number" value={form.capacity_pax ?? ""} onChange={(e)=>set("capacity_pax", e.target.value ? (isNaN(Number(e.target.value)) ? null : Number(e.target.value)) : null)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Range (nm)</Label>
              <Input type="number" value={form.range_nm ?? ""} onChange={(e)=>set("range_nm", e.target.value ? (isNaN(Number(e.target.value)) ? null : Number(e.target.value)) : null)} />
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
          <Button variant="ghost" onClick={()=>handleOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save Aircraft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
