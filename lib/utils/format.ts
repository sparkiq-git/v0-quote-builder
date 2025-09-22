import { format, formatDistanceToNow, isValid, parseISO } from "date-fns"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = parseISO(dateString)
  if (!isValid(date)) return "Invalid date"
  return format(date, "MMM d, yyyy")
}

export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString)
  if (!isValid(date)) return "Invalid date"
  return format(date, "MMM d, yyyy h:mm a")
}

export function formatTimeAgo(dateString: string): string {
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

export function generateQuoteToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = "qt_"
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
