"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CalendarIcon, Clock } from "lucide-react"

interface SimpleDateTimePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  showOnlyDate?: boolean
  showOnlyTime?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SimpleDateTimePicker({
  date,
  onDateChange,
  showOnlyDate = false,
  showOnlyTime = false,
  placeholder = "mm / dd / yyyy",
  className,
  disabled = false,
}: SimpleDateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 })
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const calculatePosition = React.useCallback(() => {
    if (!buttonRef.current) return

    requestAnimationFrame(() => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Get actual dropdown height if available, otherwise estimate
      const dropdownHeight = dropdownRef.current?.offsetHeight || 400

      let top = rect.bottom + 4
      let left = Math.max(4, rect.left)

      // Calculate available space
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      // Only show above if more than 75% would be off-screen below
      // AND there's at least 200px above AND the result would be at least 100px from top
      if (spaceBelow < dropdownHeight * 0.25 && spaceAbove >= 200) {
        const wouldBeAbovePosition = rect.top - dropdownHeight - 4
        if (wouldBeAbovePosition >= 100) {
          top = wouldBeAbovePosition
        }
      }

      // Ensure dropdown doesn't go off right edge
      const maxLeft = viewportWidth - rect.width - 8
      left = Math.min(left, maxLeft)

      setPosition({
        top,
        left,
        width: rect.width,
      })
    })
  }, [])

  React.useEffect(() => {
    if (isOpen) {
      calculatePosition()

      const handleScroll = () => calculatePosition()
      const handleResize = () => calculatePosition()

      window.addEventListener("scroll", handleScroll, true)
      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("scroll", handleScroll, true)
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [isOpen, calculatePosition])

  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const formatDate = (date: Date | undefined) => {
    if (!date) return placeholder

    if (showOnlyTime) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    if (showOnlyDate) {
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    }

    return `${date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })} ${date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    if (!timeValue) return

    const [hours, minutes] = timeValue.split(":").map(Number)
    const newDate = date ? new Date(date) : new Date()
    newDate.setHours(hours, minutes, 0, 0)
    onDateChange?.(newDate)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateChange?.(undefined)
      if (showOnlyDate) {
        setIsOpen(false)
      }
      return
    }

    if (date) {
      // Preserve time when selecting a new date
      selectedDate.setHours(date.getHours(), date.getMinutes(), 0, 0)
    }

    onDateChange?.(selectedDate)

    if (showOnlyDate) {
      setIsOpen(false)
    }
  }

  const getTimeValue = () => {
    if (!date) return ""
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm transition-all",
          "disabled:pointer-events-none disabled:opacity-50",
          "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "border shadow-xs hover:text-accent-foreground",
          "px-4 py-2 w-full h-11 justify-start font-normal",
          "bg-background/40 backdrop-blur-md border-border/30",
          "hover:bg-background/60 hover:border-border/50",
          className,
        )}
      >
        <CalendarIcon className="h-4 w-4 opacity-50" />
        <span className={cn(!date && "text-muted-foreground")}>{formatDate(date)}</span>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: showOnlyTime ? `${position.width}px` : "auto",
            zIndex: 2147483647,
            pointerEvents: "auto",
          }}
          className="rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {!showOnlyTime && <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />}

          {!showOnlyDate && (
            <div className="border-t p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 opacity-50" />
                <input
                  type="time"
                  value={getTimeValue()}
                  onChange={handleTimeChange}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1",
                    "text-sm shadow-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
              </div>
            </div>
          )}

          {!showOnlyDate && !showOnlyTime && (
            <div className="border-t p-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium",
                  "h-9 px-4 py-2",
                  "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                  "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                )}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
