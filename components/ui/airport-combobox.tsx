"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type AirportType = "large_airport" | "medium_airport" | "small_airport" | string

type AirportOption = {
  id: string
  label: string
  iata?: string | null
  icao?: string | null
  name?: string | null
  city?: string | null
  country?: string | null
  country_code?: string | null // ⬅️ needed for flag + sorting
  airport_type?: AirportType | null // ⬅️ needed for sorting
  lat?: number | null
  lon?: number | null
}

const TYPE_WEIGHT: Record<string, number> = {
  large_airport: 3,
  medium_airport: 2,
  small_airport: 1,
}
const typeWeight = (t?: string | null) => (t ? (TYPE_WEIGHT[t] ?? 0) : 0)

function useDebounce<T>(value: T, delay = 150) {
  const [v, setV] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

interface AirportComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}

const CountryFlag = ({ code, className }: { code: string; className?: string }) => {
  if (!code || code.length !== 2) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center shrink-0 overflow-hidden",
          "bg-muted/20 border border-border/10",
          className,
        )}
        style={{
          width: "2rem",
          height: "1.5rem",
        }}
      >
        <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    )
  }

  const countryCode = code.toLowerCase()

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 overflow-hidden",
        "bg-transparent border border-border/10",
        "transition-all duration-150",
        "hover:border-border/30 hover:shadow-sm",
        className,
      )}
      style={{
        width: "2rem",
        height: "1.5rem",
        padding: 0,
      }}
      aria-label={`${code} flag`}
    >
      <img
        src={`https://flagcdn.com/w40/${countryCode}.png`}
        srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
        alt={`${code} flag`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "cover",
        }}
        loading="lazy"
      />
    </div>
  )
}

export function AirportCombobox({
  value,
  onChange,
  placeholder = "Select airport...",
  label,
  required = false,
}: AirportComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debounced = useDebounce(query, 150)
  const [items, setItems] = React.useState<AirportOption[]>([])
  const [loading, setLoading] = React.useState(false)

  // keep popover width aligned with trigger
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const [triggerW, setTriggerW] = React.useState(0)
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const el = triggerRef.current
    const update = () => setTriggerW(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  React.useEffect(() => {
    let active = true

    async function run() {
      const q = (debounced || "").trim()
      if (q.length < 2) {
        if (active) setItems([])
        return
      }
      setLoading(true)
      try {
        const r = await fetch(`/api/airports?q=${encodeURIComponent(q)}&limit=25`, { cache: "no-store" })
        const data = await r.json()
        if (!active) return
        const list: AirportOption[] = Array.isArray(data?.items) ? data.items : []

        // Sort: US first → by airport_type weight → by label
        list.sort((a, b) => {
          const aUS = (a.country_code || "").toUpperCase() === "US" ? 1 : 0
          const bUS = (b.country_code || "").toUpperCase() === "US" ? 1 : 0
          if (aUS !== bUS) return bUS - aUS
          const wa = typeWeight(a.airport_type)
          const wb = typeWeight(b.airport_type)
          if (wa !== wb) return wb - wa
          return (a.label || "").localeCompare(b.label || "")
        })

        setItems(list)
      } catch {
        if (active) setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [debounced])

  const selected = value ? items.find((i) => i.id === value) : undefined
  const selectedLabel = selected?.label || (value ? value : "")
  const selectedCode = (selected?.country_code || "").toUpperCase()

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef as any}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full h-11 justify-between bg-background/40 backdrop-blur-sm border-border/30 hover:bg-background/60 hover:border-border/50 font-normal"
            onClick={() => setOpen((s) => !s)}
          >
            <div className="flex items-center gap-1 min-w-0">
              <CountryFlag code={selectedCode} className="shrink-0" />
              <div className="h-4 w-px bg-border/15 mx-3 shrink-0" />
              <span className={cn("truncate", selectedLabel ? "text-foreground" : "text-muted-foreground")}>
                {selectedLabel || placeholder}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={6} className="p-0" style={{ width: Math.max(triggerW, 288) }}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by airport, code, or city"
              className="h-9"
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            <CommandList>
              {!loading && (debounced?.trim().length ?? 0) >= 2 && items.length === 0 && (
                <CommandEmpty>No airport found.</CommandEmpty>
              )}

              <CommandGroup heading={loading ? "Searching…" : "Results"}>
                {items.map((airport) => {
                  const code = (airport.country_code || "").toUpperCase()
                  return (
                    <CommandItem
                      key={airport.id}
                      value={airport.label}
                      onSelect={() => {
                        onChange(airport.id === value ? "" : airport.id)
                        setOpen(false)
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center min-w-0 flex-1 gap-0">
                        <CountryFlag code={code} className="shrink-0" />
                        <div className="w-px bg-border/10 shrink-0 mx-1.5 h-6" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{airport.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {airport.municipality || airport.municipality || "—"}
                            {airport.country_code ? ` · ${String(airport.country_code).replace(/_/g, " ")}` : ""}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn("ml-auto h-4 w-4 shrink-0", value === airport.id ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
