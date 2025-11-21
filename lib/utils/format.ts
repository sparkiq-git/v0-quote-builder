import { getAirportCoordinates } from "@/lib/data/airports"

function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
})

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
})

const RELATIVE_TIME_DIVISIONS = [
  { amount: 60, unit: "seconds" as Intl.RelativeTimeFormatUnit },
  { amount: 60, unit: "minutes" as Intl.RelativeTimeFormatUnit },
  { amount: 24, unit: "hours" as Intl.RelativeTimeFormatUnit },
  { amount: 7, unit: "days" as Intl.RelativeTimeFormatUnit },
  { amount: 4.34524, unit: "weeks" as Intl.RelativeTimeFormatUnit },
  { amount: 12, unit: "months" as Intl.RelativeTimeFormatUnit },
  { amount: Number.POSITIVE_INFINITY, unit: "years" as Intl.RelativeTimeFormatUnit },
]

export function formatCurrency(amount: number): string {
  // Handle NaN, undefined, or null values
  if (isNaN(amount) || amount == null) {
    return "$0.00"
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = parseDate(dateString)
  if (!date) return "Date TBD"
  return dateFormatter.format(date)
}

export function formatDateTime(dateString: string): string {
  const date = parseDate(dateString)
  if (!date) return "Date TBD"
  return dateTimeFormatter.format(date)
}

export function formatTimeAgo(dateString: string): string {
  const date = parseDate(dateString)
  if (!date) return "Date TBD"

  let duration = (date.getTime() - Date.now()) / 1000

  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }

  return relativeTimeFormatter.format(Math.round(duration), "years")
}

export function formatFlightTime(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (minutes === 0) {
    return `${wholeHours}h`
  }

  return `${wholeHours}h ${minutes}m`
}

export function formatAirportCode(code: string): string {
  return code.toUpperCase()
}

export function getAirportName(code: string): string | null {
  const airport = getAirportCoordinates(code)
  return airport?.name || null
}

export function formatAirportDisplay(code: string, name?: string): string {
  const airportCode = formatAirportCode(code)
  const airportName = name || getAirportName(code)
  
  if (airportName) {
    return `${airportCode} (${airportName})`
  }
  
  return airportCode
}

export function generateQuoteToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "qt_"
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
