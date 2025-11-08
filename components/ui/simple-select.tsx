"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

export interface SimpleSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SimpleSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SimpleSelectOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  icon?: React.ReactNode
}

export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  triggerClassName,
  icon,
}: SimpleSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })
  const [mounted, setMounted] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    const estimatedItemHeight = 36
    const estimatedHeight = Math.min(options.length * estimatedItemHeight + 16, 400)
    const dropdownHeight = dropdownRef.current?.offsetHeight || estimatedHeight
    const dropdownWidth = rect.width

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const spaceRight = viewportWidth - rect.left

    console.log("[v0] SimpleSelect positioning:", {
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
      viewport: { width: viewportWidth, height: viewportHeight },
      spaces: { below: spaceBelow, above: spaceAbove, right: spaceRight },
      dropdownHeight,
      dropdownWidth,
    })

    let top = rect.bottom + 4
    let left = rect.left

    if (spaceBelow < dropdownHeight + 20 && spaceAbove > spaceBelow) {
      top = rect.top - dropdownHeight - 4
      console.log("[v0] Positioning above trigger")
    } else {
      console.log("[v0] Positioning below trigger")
    }

    const minTop = 20
    const maxTop = viewportHeight - dropdownHeight - 20

    if (top < minTop) {
      top = minTop
      console.log("[v0] Adjusted top to minTop:", minTop)
    } else if (top > maxTop) {
      top = maxTop
      console.log("[v0] Adjusted top to maxTop:", maxTop)
    }

    const maxLeft = viewportWidth - dropdownWidth - 20

    if (left > maxLeft) {
      left = maxLeft
      console.log("[v0] Adjusted left to maxLeft:", maxLeft)
    }

    if (left < 20) {
      left = 20
      console.log("[v0] Adjusted left to min:", 20)
    }

    console.log("[v0] Final position:", { top, left, width: dropdownWidth })
    setPosition({ top, left, width: dropdownWidth })
  }, [options.length])

  React.useEffect(() => {
    if (isOpen) {
      console.log("[v0] Dropdown opened, calculating position")
      calculatePosition()
      const timeoutId = setTimeout(() => {
        console.log("[v0] Recalculating position after render")
        calculatePosition()
      }, 10)

      window.addEventListener("scroll", calculatePosition, true)
      window.addEventListener("resize", calculatePosition)

      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener("scroll", calculatePosition, true)
        window.removeEventListener("resize", calculatePosition)
      }
    }
  }, [isOpen, calculatePosition])

  React.useEffect(() => {
    if (!isOpen) return

    let cleanupFn: (() => void) | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const handleClickOutside = (e: MouseEvent) => {
      console.log("[v0] Click outside detected")
      const target = e.target as HTMLElement
      const isOptionButton = target.closest("[data-simple-select-option]")

      if (isOptionButton) {
        console.log("[v0] Click on option button, allowing it to handle")
        return
      }

      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        console.log("[v0] Closing dropdown due to outside click")
        setIsOpen(false)
      } else {
        console.log("[v0] Click was inside trigger or dropdown, not closing")
      }
    }

    timeoutId = setTimeout(() => {
      console.log("[v0] Attaching click-outside handler")
      document.addEventListener("mousedown", handleClickOutside)
      cleanupFn = () => {
        console.log("[v0] Removing click-outside handler")
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }, 100)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (cleanupFn) cleanupFn()
    }
  }, [isOpen])

  const handleSelect = (optionValue: string, e: React.MouseEvent) => {
    console.log("[v0] handleSelect called with value:", optionValue)
    console.log("[v0] Event details:", { type: e.type, target: e.target })
    e.stopPropagation()
    e.preventDefault()
    onValueChange(optionValue)
    setIsOpen(false)
    console.log("[v0] Dropdown closed after selection")
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    console.log("[v0] SimpleSelect toggle clicked, isOpen:", !isOpen)
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
          "hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30 dark:hover:bg-input/50",
          triggerClassName,
        )}
      >
        <span className="flex items-center gap-2">
          {icon}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={cn(
              "fixed z-[100] rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
              className,
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
          >
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-simple-select-option="true"
                  onClick={(e) => {
                    console.log("[v0] Option button clicked:", option.value)
                    handleSelect(option.value, e)
                  }}
                  onMouseDown={(e) => {
                    console.log("[v0] Option button mousedown:", option.value)
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors",
                    "hover:bg-neutral-900 hover:text-white focus:bg-neutral-900 focus:text-white",
                    value === option.value && "bg-accent/50",
                  )}
                >
                  <span className="flex items-center gap-2 flex-1">
                    {option.icon}
                    {option.label}
                  </span>
                  {value === option.value && <Check className="h-4 w-4 ml-2" />}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
