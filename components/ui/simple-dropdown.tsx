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

interface SimpleDropdownComposableProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  className?: string
}

const SimpleDropdownContext = React.createContext<{
  closeDropdown: () => void
} | null>(null)

const useSimpleDropdown = () => {
  const context = React.useContext(SimpleDropdownContext)
  if (!context) {
    throw new Error("useSimpleDropdown must be used within SimpleDropdownComposable")
  }
  return context
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

export function SimpleDropdownComposable({
  trigger,
  children,
  align = "end",
  side = "bottom",
  sideOffset = 4,
  className,
}: SimpleDropdownComposableProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const dropdownWidth = 224 // min-w-56 = 14rem = 224px
    const dropdownHeight = dropdownRef.current?.offsetHeight || 200

    let top = 0
    let left = 0

    // Calculate vertical position
    if (side === "bottom") {
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Position above
        top = rect.top - dropdownHeight - sideOffset
      } else {
        // Position below
        top = rect.bottom + sideOffset
      }
    } else if (side === "top") {
      top = rect.top - dropdownHeight - sideOffset
    } else if (side === "right") {
      top = rect.top
      left = rect.right + sideOffset
    } else if (side === "left") {
      top = rect.top
      left = rect.left - dropdownWidth - sideOffset
    }

    // Calculate horizontal position for top/bottom sides
    if (side === "top" || side === "bottom") {
      if (align === "start") {
        left = rect.left
      } else if (align === "end") {
        left = rect.right - dropdownWidth
      } else {
        left = rect.left + rect.width / 2 - dropdownWidth / 2
      }

      // Ensure dropdown stays within viewport
      const padding = 16
      left = Math.max(padding, Math.min(left, viewportWidth - dropdownWidth - padding))
    }

    // Ensure top position stays within viewport
    top = Math.max(16, Math.min(top, viewportHeight - dropdownHeight - 16))

    setPosition({ top, left })
  }, [align, side, sideOffset])

  React.useEffect(() => {
    if (isOpen) {
      calculatePosition()
      window.addEventListener("resize", calculatePosition)
      window.addEventListener("scroll", calculatePosition, true)

      return () => {
        window.removeEventListener("resize", calculatePosition)
        window.removeEventListener("scroll", calculatePosition, true)
      }
    }
  }, [isOpen, calculatePosition])

  // Click outside handler
  React.useEffect(() => {
    if (!isOpen) return

    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      cleanup = () => document.removeEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      cleanup?.()
    }
  }, [isOpen])

  const closeDropdown = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <SimpleDropdownContext.Provider value={{ closeDropdown }}>
      <div className="relative">
        <div ref={triggerRef} onClick={handleTriggerClick}>
          {trigger}
        </div>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={cn(
              "fixed z-[9999] min-w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95",
              className,
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {children}
          </div>
        )}
      </div>
    </SimpleDropdownContext.Provider>
  )
}

export function SimpleDropdownItem({
  children,
  onSelect,
  className,
  onClick,
  ...props
}: {
  children: React.ReactNode
  onSelect?: (e: React.MouseEvent) => void
  className?: string
  onClick?: (e: React.MouseEvent) => void
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">) {
  const context = React.useContext(SimpleDropdownContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    onSelect?.(e)
    onClick?.(e)

    context?.closeDropdown()
  }

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function SimpleDropdownLabel({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props}>
      {children}
    </div>
  )
}

export function SimpleDropdownSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}
