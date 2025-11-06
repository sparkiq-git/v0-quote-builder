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

  const [selectedHour, setSelectedHour] = React.useState<number>(date?.getHours() || 12)
  const [selectedMinute, setSelectedMinute] = React.useState<number>(date?.getMinutes() || 0)
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">(date && date.getHours() >= 12 ? "PM" : "AM")

  React.useEffect(() => {
    if (date) {
      const hours = date.getHours()
      setSelectedHour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours)
      setSelectedMinute(date.getMinutes())
      setSelectedPeriod(hours >= 12 ? "PM" : "AM")
    }
  }, [date])

  const calculatePosition = React.useCallback(() => {
    if (!buttonRef.current) return

    requestAnimationFrame(() => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      const dropdownWidth = showOnlyTime ? 320 : 350 // Time picker needs 320px, calendar needs ~350px
      const actualDropdownHeight = dropdownRef.current?.offsetHeight
      const dropdownHeight = actualDropdownHeight || (showOnlyTime ? 420 : 450)

      let top = rect.bottom + 4
      let left = rect.left

      const spaceBelow = viewportHeight - rect.bottom - 40 // Reserve 40px padding at bottom
      const spaceAbove = rect.top - 40 // Reserve 40px padding at top

      // If not enough space below, try positioning above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow && spaceAbove >= dropdownHeight) {
        top = rect.top - dropdownHeight - 4
      } else if (spaceBelow < dropdownHeight) {
        // Not enough space above or below, position to fit within viewport
        const maxTop = viewportHeight - dropdownHeight - 40
        top = Math.max(40, Math.min(rect.bottom + 4, maxTop))
      }

      const spaceRight = viewportWidth - rect.left
      if (spaceRight < dropdownWidth + 40) {
        // Not enough space on the right, align to right edge with padding
        left = Math.max(40, viewportWidth - dropdownWidth - 40)
      } else {
        // Enough space, use button's left position with minimum padding
        left = Math.max(40, rect.left)
      }

      setPosition({
        top,
        left,
        width: rect.width,
      })
    })
  }, [showOnlyTime])

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

  const handleTimeSelect = (hour: number, minute: number, period: "AM" | "PM") => {
    const newDate = date ? new Date(date) : new Date()
    let hours24 = hour
    if (period === "PM" && hour !== 12) {
      hours24 = hour + 12
    } else if (period === "AM" && hour === 12) {
      hours24 = 0
    }
    newDate.setHours(hours24, minute, 0, 0)
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

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

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
            width: showOnlyTime ? `${Math.max(position.width, 320)}px` : "auto",
            zIndex: 2147483647,
            pointerEvents: "auto",
          }}
          className="rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {!showOnlyTime && <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />}

          {!showOnlyDate && (
            <div className="border-t p-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 opacity-50" />
                <span className="text-sm font-medium">Select Time</span>
              </div>

              {/* AM/PM Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod("AM")
                    handleTimeSelect(selectedHour, selectedMinute, "AM")
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedPeriod === "AM"
                      ? "bg-black text-white"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod("PM")
                    handleTimeSelect(selectedHour, selectedMinute, "PM")
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedPeriod === "PM"
                      ? "bg-black text-white"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  PM
                </button>
              </div>

              {/* Hours and Minutes Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Hours */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 text-center">Hour</div>
                  <div className="max-h-[200px] overflow-y-auto rounded-md border bg-background/50 p-1">
                    <div className="grid grid-cols-3 gap-1">
                      {hours.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => {
                            setSelectedHour(hour)
                            handleTimeSelect(hour, selectedMinute, selectedPeriod)
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded text-sm font-medium transition-colors",
                            selectedHour === hour ? "bg-black text-white" : "hover:bg-muted text-foreground",
                          )}
                        >
                          {hour}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Minutes */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 text-center">Minute</div>
                  <div className="max-h-[200px] overflow-y-auto rounded-md border bg-background/50 p-1">
                    <div className="grid grid-cols-3 gap-1">
                      {minutes.map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => {
                            setSelectedMinute(minute)
                            handleTimeSelect(selectedHour, minute, selectedPeriod)
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded text-sm font-medium transition-colors",
                            selectedMinute === minute ? "bg-black text-white" : "hover:bg-muted text-foreground",
                          )}
                        >
                          {minute.toString().padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {showOnlyTime && (
                <div className="mt-3 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md text-sm font-medium",
                      "h-9 px-4 py-2",
                      "bg-black text-white shadow hover:bg-black/90",
                      "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {!showOnlyDate && !showOnlyTime && (
            <div className="border-t p-2 flex justify-start">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium",
                  "h-9 px-4 py-2",
                  "bg-black text-white shadow hover:bg-black/90",
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
