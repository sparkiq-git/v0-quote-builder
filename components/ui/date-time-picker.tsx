"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateTimePickerProps {
  date?: string
  time?: string
  onDateChange?: (date: string) => void
  onTimeChange?: (time: string) => void
  dateLabel?: string
  timeLabel?: string
  dateId?: string
  timeId?: string
  required?: boolean
  showOnlyDate?: boolean
  showOnlyTime?: boolean
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
  dateId,
  timeId,
  required,
  showOnlyDate,
  showOnlyTime,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date ? new Date(date + 'T00:00:00') : undefined)

  React.useEffect(() => {
    if (date) {
      // Add time component to avoid timezone issues when parsing date strings
      setSelectedDate(new Date(date + 'T00:00:00'))
    }
  }, [date])

  const handleDateSelect = (newDate: Date | undefined) => {
    console.log("📅 DateTimePicker handleDateSelect called", {
      newDate,
      originalDate: newDate?.toISOString(),
      localDate: newDate ? `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}` : null
    })
    setSelectedDate(newDate)
    if (newDate && onDateChange) {
      // Use local date formatting to avoid timezone issues
      const year = newDate.getFullYear()
      const month = String(newDate.getMonth() + 1).padStart(2, '0')
      const day = String(newDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`
      console.log("📅 DateTimePicker calling onDateChange with:", formattedDate)
      onDateChange(formattedDate)
    }
    setOpen(false)
  }

  if (showOnlyDate) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {dateLabel && (
          <label htmlFor={dateId} className="text-sm font-medium flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" style={{ filter: "none", textShadow: "none" }} />
            {dateLabel}
            {required && <span className="text-destructive">*</span>}
          </label>
        )}
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={dateId}
              className="w-full h-11 justify-start font-normal bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50"
            >
              {selectedDate ? selectedDate.toLocaleDateString() : "mm / dd / yyyy"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0 pointer-events-auto" align="start">
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
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  if (showOnlyTime) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {timeLabel && (
          <label htmlFor={timeId} className="text-sm font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" style={{ filter: "none", textShadow: "none" }} />
            {timeLabel}
            {required && <span className="text-destructive">*</span>}
          </label>
        )}
        <Input
          type="time"
          id={timeId}
          value={time || ""}
          onChange={(e) => onTimeChange?.(e.target.value)}
          className="h-11 bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    )
  }

  return (
    <div className="flex gap-4 w-full">
      <div className="flex flex-col gap-2 flex-1">
        {dateLabel && (
          <label htmlFor={dateId} className="text-sm font-medium flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" style={{ filter: "none", textShadow: "none" }} />
            {dateLabel}
            {required && <span className="text-destructive">*</span>}
          </label>
        )}
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={dateId}
              className="justify-start font-normal bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50"
            >
              {selectedDate ? selectedDate.toLocaleDateString() : "mm / dd / yyyy"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0 pointer-events-auto" align="start">
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
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {timeLabel && (
          <label htmlFor={timeId} className="text-sm font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" style={{ filter: "none", textShadow: "none" }} />
            {timeLabel}
            {required && <span className="text-destructive">*</span>}
          </label>
        )}
        <Input
          type="time"
          id={timeId}
          value={time || ""}
          onChange={(e) => onTimeChange?.(e.target.value)}
          className="bg-background/40 backdrop-blur-md border-border/30 hover:bg-background/60 hover:border-border/50 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
