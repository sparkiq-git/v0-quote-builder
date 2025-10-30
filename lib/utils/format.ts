import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"
import { getAirportCoordinates } from "@/lib/data/airports"

export function formatCurrency(amount: number): string {
  // Handle NaN, undefined, or null values
  if (isNaN(amount) || amount == null) {
    return "$0"
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return "Date TBD"
  const date = parseISO(dateString)
  if (!isValid(date)) return "Invalid date"
  return format(date, "MMM d, yyyy")
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "Date TBD"
  const date = parseISO(dateString)
  if (!isValid(date)) return "Invalid date"
  return format(date, "MMM d, yyyy h:mm a")
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Date TBD"
  const date = parseISO(dateString)
  if (!isValid(date)) return "Invalid date"
  return formatDistanceToNow(date, { addSuffix: true })
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
