"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandInput,
} from "@/components/ui/command"
import { Plus, Plane } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AircraftFull } from "@/lib/types"

interface Props {
  value?: string | null // aircraft_id
  onSelect: (aircraft: AircraftFull) => void
  onClickAdd?: () => void // open create modal
}

export function AircraftCombobox({ value, onSelect, onClickAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [list, setList] = useState<AircraftFull[]>([])
  const { toast } = useToast()

  // 🧭 Load aircraft list when dropdown opens
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const res = await fetch("/api/aircraft-full")
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load aircraft")
        setList(json.data || [])
      } catch (e: any) {
        toast({
          title: "Error loading aircraft",
          description: e.message,
          variant: "destructive",
        })
      }
    })()
  }, [open])

  // 🧠 Preload selected aircraft when reopening quote (if list is empty)
  useEffect(() => {
    if (!value) return
    if (list.some((a) => a.aircraft_id === value)) return

    ;(async () => {
      try {
        const res = await fetch(`/api/aircraft-full/${value}`)
        const json = await res.json()
        if (res.ok && json.data) {
          setList((prev) => [...prev, json.data])
        }
      } catch (err: any) {
        console.error("Error preloading aircraft:", err)
      }
    })()
  }, [value])

  // 🧮 Filter based on search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return list
    return list.filter((a) =>
      [a.tail_number, a.model_name, a.manufacturer_name, a.operator_name]
        .filter(Boolean)
        .some((t) => (t as string).toLowerCase().includes(s))
    )
  }, [list, search])

  const selectedLabel = value
    ? list.find((a) => a.aircraft_id === value)?.tail_number ??
      "Select aircraft"
    : "Select aircraft"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          {selectedLabel}
          <Plane className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0">
        <Command>
          <CommandInput
            placeholder="Search aircraft..."
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center py-6 gap-2">
                <p className="text-sm text-muted-foreground">
                  No aircraft found
                </p>
                {onClickAdd && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false)
                      onClickAdd()
                    }}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Create new aircraft
                  </Button>
                )}
              </div>
            </CommandEmpty>

            {filtered.map((a) => (
              <CommandItem
                key={a.aircraft_id}
                className="py-2"
                onSelect={() => {
                  onSelect(a)
                  setOpen(false)
                }}
              >
                <div className="flex items-center gap-3">
                  {a.primary_image_url ? (
                    <img
                      src={a.primary_image_url}
                      className="w-12 h-10 rounded object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-10 rounded bg-muted flex items-center justify-center text-xs">
                      No Img
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {a.tail_number} •{" "}
                      {a.manufacturer_name ? `${a.manufacturer_name}` : ""}{" "}
                      {a.model_name || "Model"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Operated by {a.operator_name || "No Operator"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                      {typeof a.capacity_pax === "number" && (
                        <span>🪑 {a.capacity_pax} pax</span>
                      )}
                      {typeof a.range_nm === "number" && (
                        <span>🛫 {a.range_nm} nm</span>
                      )}
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandList>

          {onClickAdd && (
            <div className="border-t p-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  onClickAdd()
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Aircraft
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
