"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Search, MapPin, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Airport {
  airport: string
  airport_code: string
  city: string
  country: string
  lat?: number | null
  lon?: number | null
}

interface Props {
  value: string
  onSelect: (airport: Airport) => void
  placeholder?: string
  className?: string
}

export function SimpleAirportCombobox({ value, onSelect, placeholder = "Search airports...", className }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculatePosition = () => {
    if (!triggerRef.current) return

    requestAnimationFrame(() => {
      if (!triggerRef.current) return

      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      const dropdownHeight = dropdownRef.current?.offsetHeight || 350

      console.log("[v0] Airport button rect:", rect)

      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      let top = rect.bottom + 4
      let left = rect.left

      if (spaceBelow < dropdownHeight * 0.25 && spaceAbove >= 200) {
        const abovePosition = rect.top - dropdownHeight - 4
        if (abovePosition >= 100) {
          top = abovePosition
        }
      }

      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 8
      }

      const finalPosition = {
        top: Math.max(4, top),
        left: Math.max(4, left),
        width: rect.width,
      }

      console.log("[v0] Airport calculated position:", finalPosition)
      setPosition(finalPosition)
    })
  }

  useEffect(() => {
    if (isOpen) {
      calculatePosition()
    } else {
      setPosition(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      calculatePosition()
    }

    window.addEventListener("scroll", handleScrollOrResize, true)
    window.addEventListener("resize", handleScrollOrResize)

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true)
      window.removeEventListener("resize", handleScrollOrResize)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const fetchAirports = async () => {
      if (search.length < 2) {
        setAirports([])
        return
      }

      setLoading(true)
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(search)}`)
        const data = await res.json()
        const mappedAirports: Airport[] = (data.items || []).map((item: any) => ({
          airport: item.airport || "",
          airport_code: item.airport_code || item.iata || item.icao || "",
          city: item.municipality || "",
          country: item.country_name || item.country_code || "",
          lat: item.lat ?? null,
          lon: item.lon ?? null,
        }))
        setAirports(mappedAirports)
      } catch (error) {
        console.error("Failed to fetch airports:", error)
        setAirports([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchAirports, 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleSelect = (airport: Airport) => {
    onSelect(airport)
    setIsOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect({
      airport: "",
      airport_code: "",
      city: "",
      country: "",
      lat: null,
      lon: null,
    })
    setSearch("")
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className={cn("flex items-center gap-2", !value && "text-muted-foreground")}>
          <MapPin className="h-4 w-4 opacity-50" />
          {value || placeholder}
        </span>
        {value && <X className="h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />}
      </button>

      {mounted &&
        isOpen &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              zIndex: 2147483647,
              pointerEvents: "auto",
            }}
            className="rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search airports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-1">
              {loading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}

              {!loading && search.length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </div>
              )}

              {!loading && search.length >= 2 && airports.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">No airports found</div>
              )}

              {!loading && airports.length > 0 && (
                <div className="space-y-1">
                  {airports.map((airport) => (
                    <button
                      key={`${airport.airport_code}-${airport.airport}`}
                      type="button"
                      onClick={() => handleSelect(airport)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                    >
                      <MapPin className="h-4 w-4 opacity-50" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {airport.airport_code} - {airport.airport}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {airport.city}, {airport.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
