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

  const selectedAircraft = value ? list.find((a) => a.aircraft_id === value) : null
  const selectedLabel = selectedAircraft?.tail_number ?? "Select aircraft"
  
  // Get thumbnail for selected aircraft
  const getSelectedThumbnail = () => {
    if (!selectedAircraft) return null
    if (selectedAircraft.primary_image_url) return selectedAircraft.primary_image_url
    if (selectedAircraft.aircraft_images?.length) return selectedAircraft.aircraft_images[0]
    return null
  }
  
  const selectedThumbnail = getSelectedThumbnail()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between w-full">
          <div className="flex items-center gap-2 min-w-0">
            {selectedThumbnail ? (
              <img
                src={selectedThumbnail}
                className="w-6 h-5 rounded object-cover shrink-0"
                alt=""
              />
            ) : selectedAircraft ? (
              <div className="w-6 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                <Plane className="h-3 w-3" />
              </div>
            ) : null}
            <span className="truncate">{selectedLabel}</span>
          </div>
          <Plane className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[420px] p-0">
        <Command>
          <CommandInput
            placeholder="Search aircraft..."
            onValueChange={setSearch}
          />
          <CommandList className="pointer-events-auto max-h-[320px] overflow-y-auto overflow-x-hidden">
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

            {filtered.map((a) => {
              // Get the best available image (primary > first aircraft image > placeholder)
              const getThumbnailUrl = () => {
                if (a.primary_image_url) return a.primary_image_url
                if (a.aircraft_images?.length) return a.aircraft_images[0]
                return null
              }
              
              const thumbnailUrl = getThumbnailUrl()
              
              return (
                <CommandItem
                  key={a.aircraft_id}
                  className="py-2"
                  onSelect={() => {
                    onSelect(a)
                    setOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        className="w-12 h-10 rounded object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-12 h-10 rounded bg-muted flex items-center justify-center text-xs">
                        <Plane className="h-4 w-4" />
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
              )
            })}
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
