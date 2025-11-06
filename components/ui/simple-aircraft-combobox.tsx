"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Plus, Plane, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AircraftFull } from "@/lib/types"

interface Props {
  value?: string | null // aircraft_id
  onSelect: (aircraft: AircraftFull) => void
  onClickAdd?: () => void // open create modal
}

export function SimpleAircraftCombobox({ value, onSelect, onClickAdd }: Props) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [list, setList] = useState<AircraftFull[]>([])
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const { toast } = useToast()

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Mount detection for SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate position when dropdown opens
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
      console.log("[v0] Aircraft combobox position calculated:", rect)
    } else {
      setPosition(null)
    }
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Load aircraft list when dropdown opens
  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const res = await fetch("/api/aircraft-full")
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load aircraft")
        setList(json.data || [])
        console.log("[v0] Loaded aircraft:", json.data?.length || 0)
      } catch (e: any) {
        toast({
          title: "Error loading aircraft",
          description: e.message,
          variant: "destructive",
        })
      }
    })()
  }, [open])

  // Preload selected aircraft when reopening quote (if list is empty)
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

  // Filter based on search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return list
    return list.filter((a) =>
      [a.tail_number, a.model_name, a.manufacturer_name, a.operator_name]
        .filter(Boolean)
        .some((t) => (t as string).toLowerCase().includes(s)),
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

  console.log(
    "[v0] SimpleAircraftCombobox render - mounted:",
    mounted,
    "open:",
    open,
    "position:",
    position,
    "triggerRef:",
    !!triggerRef.current,
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 justify-between w-full bg-transparent"
        onClick={() => {
          console.log("[v0] Aircraft combobox clicked, open:", !open)
          setOpen(!open)
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedThumbnail ? (
            <img
              src={selectedThumbnail || "/placeholder.svg"}
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
      </button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 420),
              zIndex: 999999,
              border: "2px solid red",
            }}
          >
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                ref={searchInputRef}
                placeholder="Search aircraft..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Aircraft List */}
            <div className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <p className="text-sm text-muted-foreground">No aircraft found</p>
                  {onClickAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        onClickAdd()
                      }}
                      className="inline-flex items-center gap-2 rounded-md text-xs px-3 py-1.5 border shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Create new aircraft
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((a) => {
                  const getThumbnailUrl = () => {
                    if (a.primary_image_url) return a.primary_image_url
                    if (a.aircraft_images?.length) return a.aircraft_images[0]
                    return null
                  }

                  const thumbnailUrl = getThumbnailUrl()

                  return (
                    <button
                      key={a.aircraft_id}
                      type="button"
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors text-left"
                      onClick={() => {
                        console.log("[v0] Aircraft selected:", a.tail_number)
                        onSelect(a)
                        setOpen(false)
                      }}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl || "/placeholder.svg"}
                          className="w-12 h-10 rounded object-cover shrink-0"
                          alt=""
                        />
                      ) : (
                        <div className="w-12 h-10 rounded bg-muted flex items-center justify-center text-xs shrink-0">
                          <Plane className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {a.tail_number} • {a.manufacturer_name ? `${a.manufacturer_name}` : ""}{" "}
                          {a.model_name || "Model"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Operated by {a.operator_name || "No Operator"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                          {typeof a.capacity_pax === "number" && <span>🪑 {a.capacity_pax} pax</span>}
                          {typeof a.range_nm === "number" && <span>🛫 {a.range_nm} nm</span>}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {onClickAdd && (
              <div className="border-t p-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onClickAdd()
                  }}
                  className="inline-flex items-center gap-2 rounded-md text-sm px-3 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Aircraft
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
