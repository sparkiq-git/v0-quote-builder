"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Search, Package, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Item {
  id: string
  name: string
  description?: string
  price?: number
}

interface Props {
  tenantId: string
  value: string | null
  onSelect: (item: Item) => void
  placeholder?: string
  className?: string
}

export function SimpleItemCombobox({ tenantId, value, onSelect, placeholder = "Search items...", className }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const dropdownHeight = 400

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top

    let top = rect.bottom + 4
    let left = rect.left

    // Only show above if there's actually enough space above (at least 400px)
    if (spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight) {
      top = rect.top - dropdownHeight - 4
    }

    if (left + rect.width > viewportWidth) {
      left = viewportWidth - rect.width - 8
    }

    setPosition({
      top: Math.max(4, Math.min(top, viewportHeight - dropdownHeight - 8)),
      left: Math.max(4, left),
      width: rect.width,
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
    const fetchItems = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/items?tenant_id=${tenantId}`)
        const data = await res.json()
        setItems(data.items || [])
      } catch (error) {
        console.error("Failed to fetch items:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchItems()
    }
  }, [isOpen, tenantId])

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

  const handleSelect = (item: Item) => {
    setSelectedItem(item)
    onSelect(item)
    setIsOpen(false)
    setSearch("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedItem(null)
    onSelect({ id: "", name: "", description: "", price: 0 })
    setSearch("")
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()),
  )

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
        <span className={cn("flex items-center gap-2", !selectedItem && "text-muted-foreground")}>
          <Package className="h-4 w-4 opacity-50" />
          {selectedItem?.name || placeholder}
        </span>
        {selectedItem && <X className="h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />}
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
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-1">
              {loading && <div className="py-6 text-center text-sm text-muted-foreground">Loading items...</div>}

              {!loading && filteredItems.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">No items found</div>
              )}

              {!loading && filteredItems.length > 0 && (
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                    >
                      <Package className="h-4 w-4 opacity-50" />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                      </div>
                      {item.price && <div className="text-xs text-muted-foreground">${item.price.toFixed(2)}</div>}
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
