"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: "default" | "destructive"
  separator?: boolean
}

interface SimpleDropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: "start" | "end"
}

export function SimpleDropdown({ trigger, items, align = "end" }: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleItemClick = (item: DropdownItem) => {
    item.onClick()
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="inline-flex"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            "mt-2",
            align === "end" ? "right-0" : "left-0",
          )}
          style={{
            top: "100%",
          }}
        >
          <div className="px-2 py-1.5 text-sm font-semibold">Actions</div>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.separator && <div className="my-1 h-px bg-border" />}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleItemClick(item)
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  item.variant === "destructive" && "text-destructive focus:text-destructive",
                )}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
