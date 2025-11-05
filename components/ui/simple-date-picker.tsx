"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

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
  const [selectedDate, setSelectedDate] = useState<string>(date || "")

  useEffect(() => {
    if (date) {
      setSelectedDate(date)
    }
  }, [date])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    console.log("[v0] Date changed:", newDate)
    setSelectedDate(newDate)
    if (onDateChange) {
      onDateChange(newDate)
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-medium flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Input
        type="date"
        id={id}
        value={selectedDate}
        onChange={handleDateChange}
        required={required}
        className="w-full h-11 bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50"
      />
    </div>
  )
}
