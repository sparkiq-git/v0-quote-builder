"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandList, CommandItem, CommandEmpty, CommandInput } from "@/components/ui/command"
import { Plus, Plane } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Aircraft {
  aircraft_id: string
  tenant_id: string
  tail_number: string
  operator_name?: string
  manufacturer_name?: string
  model_name?: string
  amenities?: string[]
}

interface AircraftComboboxProps {
  value?: string | null
  onSelect: (aircraft: Aircraft) => void
}

export function AircraftCombobox({ value, onSelect }: AircraftComboboxProps) {
  const [open, setOpen] = useState(false)
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  // Tenant ID from env
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID

  useEffect(() => {
    if (!tenantId) {
      console.warn("⚠️ TENANT_ID is missing — aircraft search disabled.")
    }
  }, [tenantId])

  // Fetch aircraft
  useEffect(() => {
    if (!open || !tenantId) return

    const fetchAircraft = async () => {
      const { data, error } = await supabase
        .from("aircraft_full_view")
        .select("*")
        .eq("tenant_id", tenantId)
        .or(
          `tail_number.ilike.%${search}%,manufacturer_name.ilike.%${search}%,model_name.ilike.%${search}%,operator_name.ilike.%${search}%`
        )
        .limit(25)

      if (error) {
        console.error("Supabase aircraft fetch error:", JSON.stringify(error, null, 2))
        toast({
          title: "Error loading aircraft",
          description: error.message || "Unexpected error",
          variant: "destructive",
        })
      } else {
        setAircraftList(data || [])
      }
    }

    fetchAircraft()
  }, [open, search, tenantId])

  // Create new aircraft (minimal fields)
  const handleCreate = async (form: FormData) => {
    const tail_number = form.get("tail_number") as string
    const manufacturer_name = form.get("manufacturer_name") as string
    const model_name = form.get("model_name") as string
    if (!tail_number || !tenantId) return

    const { data, error } = await supabase
      .from("aircraft")
      .insert([
        {
          tenant_id: tenantId,
          tail_number,
          notes: `${manufacturer_name} ${model_name}`,
          status: "ACTIVE",
        },
      ])
      .select()
      .single()

    if (error) {
      toast({ title: "Error creating aircraft", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Aircraft created", description: `Tail ${tail_number} added.` })
      onSelect(data)
      setOpen(false)
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {value
            ? aircraftList.find((a) => a.aircraft_id === value)?.tail_number || "Select aircraft"
            : "Select aircraft"}
          <Plane className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0">
        {!creating ? (
          <Command>
            <CommandInput placeholder="Search aircraft..." onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center py-6">
                  <p className="text-sm text-muted-foreground mb-2">No aircraft found</p>
                  <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Create new aircraft
                  </Button>
                </div>
              </CommandEmpty>

              {aircraftList.map((a) => (
                <CommandItem
                  key={a.aircraft_id}
                  onSelect={() => {
                    onSelect(a)
                    setOpen(false)
                  }}
                >
                  <div>
                    <div className="font-medium">{a.tail_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.manufacturer_name} {a.model_name} • {a.operator_name || "No Operator"}
                    </div>
                    {a.amenities?.length ? (
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">
                        {a.amenities.join(", ")}
                      </div>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        ) : (
          <form className="p-4 space-y-2" action={(formData) => handleCreate(formData)}>
            <div className="grid gap-1.5">
              <Label>Tail Number *</Label>
              <Input name="tail_number" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Manufacturer</Label>
              <Input name="manufacturer_name" placeholder="e.g. Gulfstream" />
            </div>
            <div className="grid gap-1.5">
              <Label>Model</Label>
              <Input name="model_name" placeholder="e.g. G200" />
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Aircraft</Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
