"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plane, Info, Mail, Phone, CheckCircle, Clock, CreditCard, FileText } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

import { AdaptiveQuoteCard } from "@/components/quotes/adaptive-quote-card"
import { useDeviceDetection } from "@/hooks/use-device-detection"
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

interface PublicQuotePageProps {
  params: { token: string }
  /** If provided, external accept handler (secure mode) */
  onAccept?: () => void
  /** If provided, external decline handler (secure mode) */
  onDecline?: () => void
  /** Optional verified email for context display */
  verifiedEmail?: string
  /** Optional quote data (for action link flow) */
  quote?: any
}

/* ---------- Primitives ---------- */

function SectionCard({
  children,
  className = "",
  contentClassName = "",
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={`shadow-lg border-0 bg-white/80 backdrop-blur-sm ${className}`}>
      <CardContent className={`pt-0 ${contentClassName}`}>{children}</CardContent>
    </Card>
  )
}

/* ---------- Connector ---------- */

function ElegantConnector() {
  return (
    <div className="relative w-full h-4 md:h-5 overflow-hidden select-none" aria-hidden="true">
      <span className="absolute top-1/2 -translate-y-1/2 left-[12%] right-[55%] h-[2px] bg-gray-200 rounded" />
      <span className="absolute top-1/2 -translate-y-1/2 left-[55%] right-[12%] h-[2px] bg-gray-200 rounded" />
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        width="14"
        height="10"
        viewBox="0 0 14 10"
        fill="none"
        aria-hidden="true"
      >
        <path d="M1 5h6.5M7 2l4 3-4 3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute left-[7%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-600" />
      <span className="absolute right-[7%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-600" />
    </div>
  )
}

/* ---------- Helpers ---------- */

function airportLabel(code?: string) {
  if (!code) return ""
  switch (code) {
    case "MIA":
      return "Miami, FL"
    case "TEB":
      return "Teterboro, NJ"
    case "SFO":
      return "San Francisco, CA"
    case "BOS":
      return "Boston, MA"
    case "FXE":
      return "Fort Lauderdale Exec, FL"
    default:
      return code
  }
}

function TripInfoList({
  date,
  passengers,
  origin,
  destination,
}: {
  date: string
  passengers: number
  origin: string
  destination: string
}) {
  return (
    <div className="space-y-1 text-xs leading-5 font-light">
      <div>
        <span className="font-medium">Date:</span> {date}
      </div>
      <div>
        <span className="font-medium">Passengers:</span> {passengers}
      </div>
      <div>
        <span className="font-medium">Origin:</span> {airportLabel(origin)}
      </div>
      <div>
        <span className="font-medium">Destination:</span> {airportLabel(destination)}
      </div>
    </div>
  )
}

/* ---------- Info control ---------- */

function TripInfoControl({
  date,
  passengers,
  origin,
  destination,
  dialogId,
}: {
  date: string
  passengers: number
  origin: string
  destination: string
  dialogId: string
}) {
  return (
    <>
      <div className="hidden md:inline-flex">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              aria-label="Trip details"
            >
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="center" sideOffset={8} className="w-64 p-3 border bg-white shadow-sm">
            <TripInfoList date={date} passengers={passengers} origin={origin} destination={destination} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="md:hidden">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
              aria-label="Trip details"
            >
              <Info className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[360px]" aria-describedby={dialogId}>
            <DialogHeader>
              <DialogTitle>Trip details</DialogTitle>
              <DialogDescription id={dialogId}>Overview for this leg.</DialogDescription>
            </DialogHeader>
            <TripInfoList date={date} passengers={passengers} origin={origin} destination={destination} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

/* ---------- Leg Row ---------- */

function LegRow({ leg, index }: { leg: any; index: number }) {
  const codeCls =
    "font-semibold leading-none tracking-tight uppercase whitespace-nowrap text-[clamp(0.95rem,1.6vw,1.05rem)]"

  return (
    <div className="px-2 py-1.5 grid items-center gap-x-2 gap-y-1 [grid-template-columns:max-content_1fr_max-content_auto]">
      <div className="col-span-4 row-start-1 text-xs text-gray-500 mt-0.5 font-light">
        {formatDate(leg.depart_dt || leg.departureDate)}
      </div>
      <div className="col-start-1 row-start-2">
        <div className={codeCls}>{leg.origin_code || leg.origin}</div>
      </div>
      <div className="col-start-2 row-start-2 min-w-0">
        <ElegantConnector />
      </div>
      <div className="col-start-3 row-start-2 justify-self-end">
        <div className={codeCls}>{leg.destination_code || leg.destination}</div>
      </div>
      <div className="col-start-4 row-span-2 self-center justify-self-end pr-1 md:pr-2">
        <TripInfoControl
          date={formatDate(leg.depart_dt || leg.departureDate)}
          passengers={leg.pax_count || leg.passengers}
          origin={leg.origin_code || leg.origin}
          destination={leg.destination_code || leg.destination}
          dialogId={`leg-${index + 1}-trip-info`}
        />
      </div>
    </div>
  )
}

/* ===================================================================== */

export default function PublicQuotePage({ params, onAccept, onDecline, verifiedEmail, quote }: PublicQuotePageProps) {
  const { toast } = useToast()
  const deviceInfo = useDeviceDetection()
  const [hasViewed, setHasViewed] = useState(false)
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [declineNotes, setDeclineNotes] = useState("")
  const [showValidationAlert, setShowValidationAlert] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(quote?.selectedOptionId || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (quote && !hasViewed) {
      // TODO: Add analytics tracking here if needed
      setHasViewed(true)
    }
  }, [quote, hasViewed, verifiedEmail])

  useEffect(() => {
    const isSubmitted =
      quote?.status === "client_accepted" ||
      quote?.status === "availability_confirmed" ||
      quote?.status === "payment_received" ||
      quote?.status === "itinerary_created"
    const isDeclined = quote?.status === "declined"
    const locked = Boolean(isSubmitted || isDeclined)
    setIsLocked(locked)

    if (quote && quote.options?.length === 1 && !selectedOptionId && !locked) {
      setSelectedOptionId(quote.options[0].id)
    }
  }, [quote, selectedOptionId])

  const selectedOption = quote?.options?.find((o) => o.id === selectedOptionId) || null

  const handleSelectOption = async (optionId: string) => {
    if (isLocked) return
    setShowValidationAlert(false)
    setSelectedOptionId(optionId)

    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-public-quote": "true",
        },
        body: JSON.stringify({ selectedOptionId: optionId }),
      })

      if (!response.ok) {
        throw new Error("Failed to update selection")
      }

      // Don't show toast for selection, only for final action
    } catch (error) {
      console.error("Failed to update selection:", error)
      toast({
        title: "Error",
        description: "Failed to save your selection. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Updated accept handler with token revocation
  const handleSubmitQuote = async () => {
    if (onAccept) return onAccept()
    if (!selectedOptionId) {
      setShowValidationAlert(true)
      toast({
        title: "Aircraft selection required",
        description: "You must select an aircraft option before requesting to book.",
        variant: "destructive",
      })
      setTimeout(() => setShowValidationAlert(false), 5000)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-public-quote": "true",
        },
        body: JSON.stringify({
          selectedOptionId,
          status: "accepted",
        }),
      })

      // Parse response
      let json
      try {
        json = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, get text
        const text = await response.text()
        throw new Error(text || "Server returned invalid response")
      }

      if (!response.ok) {
        throw new Error(json?.error || "Failed to accept quote")
      }

      toast({
        title: "Quote accepted successfully!",
        description:
          "We've received your acceptance. We'll now check availability and send you the contract and payment details shortly.",
      })
    } catch (error: any) {
      console.error("Failed to accept quote:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to accept quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeclineQuote = async () => {
    if (onDecline) return onDecline()
    if (!declineReason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for declining the quote.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-public-quote": "true",
        },
        body: JSON.stringify({
          status: "declined",
          declineReason,
          declineNotes,
        }),
      })

      // Parse response
      let json
      try {
        json = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, get text
        const text = await response.text()
        throw new Error(text || "Server returned invalid response")
      }

      if (!response.ok) {
        throw new Error(json?.error || "Failed to decline quote")
      }

      toast({
        title: "Quote declined",
        description: "Your decline has been recorded and the broker has been notified. Thank you for your time.",
      })
      setIsDeclineModalOpen(false)
      setDeclineReason("")
      setDeclineNotes("")
    } catch (error: any) {
      console.error("Failed to decline quote:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to decline quote. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  // =========================

  // Show loading state if quote is not available
  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    )
  }

  // REAL DATA (from store) wired into props/sections
  const servicesTotal =
    quote.services?.reduce((sum, s) => {
      const amount = s.amount || 0
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0) || 0

  const selectedOptionTotal = selectedOption
    ? (selectedOption.cost_operator || 0) +
      (selectedOption.price_commission || 0) +
      (selectedOption.feesEnabled
        ? selectedOption.fees?.reduce((sum, fee) => {
            const amount = fee.amount || 0
            return sum + (isNaN(amount) ? 0 : amount)
          }, 0) || 0
        : 0)
    : 0

  const grandTotal = (selectedOptionTotal || 0) + (servicesTotal || 0)

  const displayOptions =
    (["client_accepted", "availability_confirmed", "payment_received", "itinerary_created"] as const).includes(
      quote.status,
    ) && selectedOptionId
      ? [
          ...quote.options.filter((o) => o.id === selectedOptionId),
          ...quote.options.filter((o) => o.id !== selectedOptionId),
        ]
      : quote.options || []

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending_response":
        return { text: "Pending Your Response", variant: "outline" as const, icon: Clock }
      case "client_accepted":
        return { text: "Checking Availability", variant: "default" as const, icon: CheckCircle }
      case "availability_confirmed":
        return { text: "Contract Being Prepared", variant: "default" as const, icon: FileText }
      case "payment_received":
        return { text: "Preparing Itinerary", variant: "default" as const, icon: CreditCard }
      case "itinerary_created":
        return { text: "Confirmed & Itinerary Ready", variant: "default" as const, icon: CheckCircle }
      case "declined":
        return { text: "Declined", variant: "destructive" as const, icon: Clock }
      case "expired":
        return { text: "Expired", variant: "secondary" as const, icon: Clock }
      default:
        return { text: status.replace("_", " "), variant: "outline" as const, icon: Clock }
    }
  }

  const statusDisplay = getStatusDisplay(quote.status)
  const StatusIcon = statusDisplay.icon

  const getButtonText = () => {
    if (!isLocked) {
      return selectedOptionId ? "Confirm & Request Availability" : "Select an aircraft to accept"
    }
    switch (quote.status) {
      case "accepted":
        return "Quote Accepted - Awaiting Availability"
      case "availability_confirmed":
        return "Contract Being Prepared"
      case "payment_received":
        return "Preparing Itinerary"
      case "itinerary_created":
        return "Confirmed & Itinerary Ready"
      case "declined":
        return "Quote Declined"
      case "expired":
        return "Quote Expired"
      default:
        return "Processing..."
    }
  }

  const getButtonStyle = () => {
    if (!isLocked) {
      return selectedOptionId
        ? { background: "#1e40af !important", color: "#ffffff !important" }
        : { background: "#e5e7eb !important", color: "#4b5563 !important" }
    }
    switch (quote.status) {
      case "itinerary_created":
        return { background: "#059669 !important", color: "#ffffff !important" }
      case "declined":
      case "expired":
        return { background: "#dc2626 !important", color: "#ffffff !important" }
      default:
        return { background: "#6b7280 !important", color: "#ffffff !important" }
    }
  }

  // Device-specific layout logic
  const getLayoutClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900",
          content: "p-2 sm:p-3 space-y-2 sm:space-y-3",
          grid: "grid grid-cols-1 gap-3 sm:gap-4",
        }
      case "tablet":
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900",
          content: "p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5",
          grid: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5",
        }
      case "desktop":
        return {
          container:
            "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900 lg:h-screen lg:overflow-hidden overflow-x-hidden",
          content: "p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6",
          grid: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6",
        }
      case "large-desktop":
        return {
          container:
            "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900 xl:h-screen xl:overflow-hidden overflow-x-hidden",
          content: "p-5 sm:p-6 xl:p-8 space-y-5 sm:space-y-6 xl:space-y-8",
          grid: "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 xl:gap-8",
        }
      default:
        return {
          container: "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900",
          content: "p-3 sm:p-4 space-y-3 sm:space-y-4",
          grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
        }
    }
  }

  const layoutClasses = getLayoutClasses()

  // Check if quote is expired
  const isExpired = quote?.validUntil && new Date(quote.validUntil) < new Date()
  const expirationDate = quote?.validUntil ? formatDateTime(quote.validUntil) : null

  return (
    <div className={layoutClasses.container}>
      {/* ========================= MOBILE & TABLET ========================= */}
      <div className={deviceInfo.type === "mobile" || deviceInfo.type === "tablet" ? "block" : "hidden"}>
        <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
          <SectionCard>
            {/* Branding */}
            <div className="flex items-center gap-2">
              <img src="/images/aero-iq-logo.png" alt="Aero IQ" className="h-5 w-auto mb-3" />
            </div>

            {/* Customer with Expiration Date */}
            <div className="space-y-0 relative">
              {/* Expiration date in top right */}
              {expirationDate && (
                <div className="absolute top-0 right-0 text-right">
                  <p className={`text-xs ${isExpired ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"}`}>
                    {isExpired ? "Expired" : "Expires"}
                  </p>
                  <p className={`text-xs ${isExpired ? "text-red-500 font-light" : "text-amber-600 font-light"}`}>
                    {expirationDate}
                  </p>
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{quote.customer?.name ?? "Fernando Arriaga"}</p>
                <p className="text-xs text-gray-600 font-light">{quote.customer?.company ?? "Spark IQ"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-light">{quote.customer?.email ?? "farriaga@sparkiq.io"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-light">{quote.customer?.phone ?? "619-606-1123"}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Trip Summary directly under Customer */}
          <SectionCard>
            <div className="divide-y divide-gray-200">
              <p className="font-semibold text-sm py-1.5">Trip Summary</p>
              {quote.legs?.map((leg, index) => (
                <LegRow key={index} leg={leg} index={index} />
              ))}
            </div>
          </SectionCard>

          {/* Additional Services (list) */}
          {quote.services?.length > 0 && (
            <SectionCard>
              <p className="font-semibold text-sm">Additional Services</p>
              <ul className="space-y-0 text-xs font-light">
                {quote.services.map((service) => (
                  <li key={service.id} className="text-gray-700">
                    <span className="font-medium">{service.name}</span>
                    {service.description && <span className="text-gray-500"> — {service.description}</span>}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Total Trip Cost */}
          <SectionCard>
            <div className="space-y-0 py-1.5">
              <p className="font-semibold text-sm mb-2">Total Trip Cost</p>

              <div className="grid grid-cols-2 items-center">
                <span className="text-gray-700 text-xs font-light">Selected Aircraft</span>
                <span className="font-semibold text-right text-xs">{formatCurrency(selectedOptionTotal)}</span>
              </div>

              {quote.services?.map((s) => (
                <div key={s.id} className="grid grid-cols-2 items-center text-xs">
                  <span className="text-gray-600 font-light">{s.name}</span>
                  <span className="text-right font-light">{formatCurrency(s.amount)}</span>
                </div>
              ))}

              <div className="grid grid-cols-2 items-center font-semibold text-sm pt-3 border-t border-gray-200">
                <span>Grand Total</span>
                <span className="text-right">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Enhanced Aircraft Options */}
          <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-white/80 backdrop-blur-sm p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl border border-gray-200/50">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-blue-600" />
                <p className="text-gray-800 font-semibold text-sm sm:text-base">Aircraft Options</p>
              </div>
              <Badge
                variant={statusDisplay.variant}
                className="text-xs flex items-center gap-1 px-3 py-1 self-start sm:self-auto font-medium"
              >
                <StatusIcon className="h-3 w-3" />
                {statusDisplay.text}
              </Badge>
            </div>
            <div className={layoutClasses.grid}>
              {displayOptions.map((option) => (
                <div key={option.id} className="w-full">
                  <AdaptiveQuoteCard
                    option={option}
                    isSelected={option.id === selectedOptionId}
                    isLocked={isLocked}
                    onSelect={() => handleSelectOption(option.id)}
                    primaryColor={quote.branding?.primaryColor}
                    hasSelectedOption={!!selectedOptionId}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Terms (visible on phones) */}
          {quote.options?.length >= 1 && quote.terms && (
            <SectionCard className="mt-2">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap font-light">{quote.terms}</p>
            </SectionCard>
          )}

          {/* Actions */}
          <div
            className="
              sticky bottom-0 -mx-6 px-6 pt-3 pb-4 z-50
              bg-white/50 dark:bg-gray-950/50
              supports-[backdrop-filter]:backdrop-blur
              supports-[backdrop-filter]:bg-white/30
              dark:supports-[backdrop-filter]:bg-gray-950/30
              before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6
              before:bg-gradient-to-t before:from-white/50 before:to-transparent
              dark:before:from-gray-950/50 dark:before:to-transparent
            "
          >
            <div className="space-y-3 pb-6">
              {quote.status === "itinerary_created" && (
                <Button asChild className="w-full !bg-blue-600 hover:!bg-blue-700 !text-white !font-semibold">
                  <a href={`/itineraries/${quote.id}`} target="_blank" rel="noopener noreferrer">
                    View Your Itinerary
                  </a>
                </Button>
              )}

              <Button
                onClick={selectedOptionId ? handleSubmitQuote : undefined}
                disabled={isLocked || !selectedOptionId}
                className={`w-full hover:opacity-90 transition-opacity !font-semibold ${
                  !isLocked && selectedOptionId ? "!bg-blue-700" : ""
                }`}
                style={{
                  ...getButtonStyle(),
                  borderColor: "transparent !important",
                }}
              >
                {getButtonText()}
              </Button>

              {/* Not Interested button - show below confirm button */}
              {!isLocked &&
                (quote.status === "pending_response" ||
                  quote.status === "opened" ||
                  quote.status === "awaiting response") && (
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                    onClick={() => setIsDeclineModalOpen(true)}
                  >
                    Not Interested
                  </Button>
                )}

              {/* Decline dialog */}
              <Dialog open={isDeclineModalOpen} onOpenChange={setIsDeclineModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="hidden" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] mx-4">
                  <DialogHeader>
                    <DialogTitle>Not Interested</DialogTitle>
                    <DialogDescription>
                      We'd love to know why this quote isn't right for you. This helps us improve our service.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reason">Reason *</Label>
                      <Select value={declineReason} onValueChange={setDeclineReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pricing">Pricing concerns</SelectItem>
                          <SelectItem value="timing">Timing not right</SelectItem>
                          <SelectItem value="aircraft">Aircraft preferences</SelectItem>
                          <SelectItem value="found_alternative">Found alternative option</SelectItem>
                          <SelectItem value="cancelled">Trip cancelled</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Additional feedback (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional feedback..."
                        value={declineNotes}
                        onChange={(e) => setDeclineNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeclineModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeclineQuote}
                      disabled={isSubmitting || !declineReason}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* ========================= DESKTOP ========================= */}
      <div className={deviceInfo.type === "desktop" || deviceInfo.type === "large-desktop" ? "block" : "hidden"}>
        <div className="absolute inset-0 z-10">
          <div className="h-full flex">
            {/* LEFT PANE (full height scroll) */}
            <div className="w-1/4 xl:w-1/3 h-full overflow-y-auto overflow-x-hidden">
              <div className="relative h-full p-4 xl:p-6 pb-28">
                <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-5 xl:p-7 space-y-5 xl:space-y-6">
                    {/* Branding */}
                    <div className="flex items-center gap-2">
                      <img src="/images/aero-iq-logo.png" alt="Aero IQ" className="h-5 w-auto" />
                    </div>

                    {/* Customer with Expiration Date */}
                    <div className="space-y-2 relative pb-4 border-b border-gray-200/50">
                      {/* Expiration date in top right */}
                      {expirationDate && (
                        <div className="absolute top-0 right-0 text-right">
                          <p
                            className={`text-xs ${isExpired ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"}`}
                          >
                            {isExpired ? "Expired" : "Expires"}
                          </p>
                          <p
                            className={`text-xs ${isExpired ? "text-red-500 font-light" : "text-amber-600 font-light"}`}
                          >
                            {expirationDate}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{quote.customer?.name ?? "Fernando Arriaga"}</p>
                        <p className="text-xs text-gray-600 font-light">{quote.customer?.company ?? "Spark IQ"}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-xs font-light">{quote.customer?.email ?? "farriaga@sparkiq.io"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-xs font-light">{quote.customer?.phone ?? "619-606-1123"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Trip Summary */}
                    <div className="pb-4 border-b border-gray-200/50">
                      <p className="font-semibold text-sm mb-3">Trip Summary</p>
                      <div className="divide-y divide-gray-200">
                        {quote.legs?.map((leg, index) => (
                          <LegRow key={index} leg={leg} index={index} />
                        ))}
                      </div>
                    </div>

                    {/* Additional Services */}
                    {quote.services?.length > 0 && (
                      <div className="pb-4 border-b border-gray-200/50">
                        <p className="font-semibold text-sm mb-3">Additional Services</p>
                        <ul className="space-y-1 text-xs font-light">
                          {quote.services.map((service) => (
                            <li key={service.id} className="text-gray-700">
                              <span className="font-medium">{service.name}</span>
                              {service.description && <span className="text-gray-500"> — {service.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Total Trip Cost */}
                    <div>
                      <p className="font-semibold text-sm mb-3">Total Trip Cost</p>
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 items-center">
                          <span className="text-gray-700 text-xs font-light">Selected Aircraft</span>
                          <span className="font-semibold text-right text-xs">
                            {formatCurrency(selectedOptionTotal)}
                          </span>
                        </div>

                        {quote.services?.map((s) => (
                          <div key={s.id} className="grid grid-cols-2 items-center text-xs">
                            <span className="text-gray-600 font-light">{s.name}</span>
                            <span className="text-right font-light">{formatCurrency(s.amount)}</span>
                          </div>
                        ))}

                        <div className="grid grid-cols-2 items-center font-semibold text-sm pt-3 border-t border-gray-200">
                          <span>Grand Total</span>
                          <span className="text-right">{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FULL-BLEED STICKY ACTIONS */}
                <div
                  className="
                    sticky bottom-0 -mx-6 px-6 pt-3 pb-4 z-50
                    bg-white/50 dark:bg-gray-950/50
                    supports-[backdrop-filter]:backdrop-blur
                    supports-[backdrop-filter]:bg-white/30
                    dark:supports-[backdrop-filter]:bg-gray-950/30
                    before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6
                    before:bg-gradient-to-t before:from-white/50 before:to-transparent
                    dark:before:from-gray-950/50 dark:before:to-transparent
                  "
                >
                  <div className="space-y-3">
                    {quote.status === "itinerary_created" && (
                      <Button asChild className="w-full !bg-blue-600 hover:!bg-blue-700 !text-white !font-semibold">
                        <a href={`/itineraries/${quote.id}`} target="_blank" rel="noopener noreferrer">
                          View Your Itinerary
                        </a>
                      </Button>
                    )}

                    <Button
                      onClick={selectedOptionId ? handleSubmitQuote : undefined}
                      disabled={isLocked || !selectedOptionId}
                      className={`w-full hover:opacity-90 transition-opacity relative z-50 !font-semibold ${
                        !isLocked && selectedOptionId ? "!bg-blue-700" : ""
                      }`}
                      style={{
                        ...getButtonStyle(),
                        borderColor: "transparent !important",
                      }}
                    >
                      {getButtonText()}
                    </Button>

                    {/* Not Interested button - show below confirm button */}
                    {!isLocked &&
                      (quote.status === "pending_response" ||
                        quote.status === "opened" ||
                        quote.status === "awaiting response") && (
                        <Button
                          variant="outline"
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
                          onClick={() => setIsDeclineModalOpen(true)}
                        >
                          Not Interested
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right spacer */}
            <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:bg-gray-900" />
          </div>
        </div>

        {/* Right pane: options (full height scroll) */}
        <div className="absolute top-0 right-0 bottom-1 left-1/4 lg:left-1/3 xl:left-1/3 z-20 overflow-x-hidden">
          <div className="h-full pt-3 lg:pt-4 xl:pt-6 pb-3 lg:pb-4 xl:pb-6 px-2 lg:px-3 xl:px-3">
            <div className="h-full overflow-y-auto overflow-x-hidden bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-xl p-0">
              <div className="p-0">
                <div className="px-4 xl:px-6 py-3 xl:py-4 border-b border-gray-200/50 bg-gradient-to-r from-white/90 to-blue-50/50 backdrop-blur-sm mb-3 xl:mb-4">
                  <div className="flex items-center justify-end">
                    
                    <Badge variant={statusDisplay.variant} className="text-xs flex items-center gap-1 px-3 py-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusDisplay.text}
                    </Badge>
                  </div>
                </div>

                <div className="px-2 xl:px-4 space-y-2 lg:space-y-3 xl:space-y-4 lg:px-0">
                  {displayOptions.map((option) => (
                    <div key={option.id} className="w-full">
                      <AdaptiveQuoteCard
                        option={option}
                        isSelected={option.id === selectedOptionId}
                        isLocked={isLocked}
                        onSelect={() => handleSelectOption(option.id)}
                        primaryColor={quote.branding?.primaryColor}
                        hasSelectedOption={!!selectedOptionId}
                      />
                    </div>
                  ))}
                </div>

                {/* Desktop Terms (same width as cards) */}
                {quote.options?.length >= 1 && quote.terms && (
                  <div className="flex justify-center pl-6 pr-6">
                    <Card className="mt-3 mb-3 w-full">
                      <CardContent className="pl-1">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap font-light">{quote.terms}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {quote.options?.length === 0 && (
                  <Card className="mx-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Plane className="h-14 w-14 text-muted-foreground mb-3" />
                      <h3 className="text-base font-semibold mb-1">No aircraft options available</h3>
                      <p className="text-muted-foreground text-center text-sm font-light">
                        Please contact us directly to discuss aircraft options for your trip.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* /Right pane */}
      </div>
    </div>
  )
}
