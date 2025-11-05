"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"

interface SimpleDatePickerProps {
  date?: string
  onDateChange?: (date: string) => void
  label?: string
  id?: string
  required?: boolean
  placeholder?: string
}

export function SimpleDatePicker({
  date,
  onDateChange,
  label,
  id,
  required,
  placeholder = "mm / dd / yyyy",
}: SimpleDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date ? new Date(date + "T00:00:00") : undefined)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (date) {
      setSelectedDate(new Date(date + "T00:00:00"))
    }
  }, [date])

  // Click outside to close
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

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    if (newDate && onDateChange) {
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, "0")
      const day = String(newDate.getDate()).padStart(2, "0")
      const formattedDate = `${year}-${month}-${day}`
      onDateChange(formattedDate)
    }
    setOpen(false)
  }

  const position = triggerRef.current?.getBoundingClientRect()

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Button
        ref={triggerRef}
        variant="outline"
        id={id}
        className="w-full h-11 justify-start font-normal bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {selectedDate ? selectedDate.toLocaleDateString() : placeholder}
      </Button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 w-auto overflow-hidden rounded-md border bg-popover p-0 shadow-md"
            style={{
              top: position.bottom + 4,
              left: position.left,
            }}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
              fromYear={2024}
              toYear={2030}
              initialFocus
              className="pointer-events-auto"
            />
          </div>,
          document.body,
        )}
    </div>
  )
}
