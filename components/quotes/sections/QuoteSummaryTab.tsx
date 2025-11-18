"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  FileText,
  ChevronRight,
  Send,
  Clock,
  Users,
  Plane,
  Wifi,
  Coffee,
  Utensils,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"
import Image from "next/image"

const MAX_OPTION_IMAGES = 6

const placeholderImage = (label: string) =>
  `/placeholder.svg?height=80&width=100&query=${encodeURIComponent(`${label || "Aircraft"} aircraft`)}`

const isLikelyValidImageUrl = (src: string) => {
  if (!src) return false
  const trimmed = src.trim()
  if (!trimmed || trimmed.includes("undefined") || trimmed.includes("[object")) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/^\/\//.test(trimmed)) return true
  if (trimmed.startsWith("/")) return true
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return true
  return false
}

const normalizeImageSource = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === "string") return value.trim()
  if (typeof value === "object") {
    const candidate =
      (value as Record<string, unknown>).public_url ??
      (value as Record<string, unknown>).publicUrl ??
      (value as Record<string, unknown>).url ??
      (value as Record<string, unknown>).src
    if (typeof candidate === "string") {
      return candidate.trim()
    }
  }
  return null
}

const collectOptionImages = (option: any, fallbackLabel: string) => {
  const rawImages: unknown[] = [
    ...(Array.isArray(option?.overrideImages) ? option.overrideImages : []),
    ...(Array.isArray(option?.aircraftTail?.images) ? option.aircraftTail.images : []),
    ...(Array.isArray(option?.aircraftModel?.images) ? option.aircraftModel.images : []),
  ]

  const normalized = rawImages
    .map(normalizeImageSource)
    .filter((value): value is string => typeof value === "string" && isLikelyValidImageUrl(value))

  const uniqueImages = Array.from(new Set(normalized))

  if (uniqueImages.length === 0) {
    return [placeholderImage(fallbackLabel)]
  }

  return uniqueImages.slice(0, MAX_OPTION_IMAGES)
}

const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000)

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const toTimeInputValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

function OptionImageThumbnail({
  src,
  alt,
  fallbackLabel,
}: {
  src: string
  alt: string
  fallbackLabel: string
}) {
  const fallbackSrc = useMemo(() => placeholderImage(fallbackLabel), [fallbackLabel])
  const [currentSrc, setCurrentSrc] = useState(() =>
    isLikelyValidImageUrl(src) ? src : fallbackSrc
  )

  useEffect(() => {
    setCurrentSrc(isLikelyValidImageUrl(src) ? src : fallbackSrc)
  }, [src, fallbackSrc])

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes="80px"
      className="object-cover"
      onError={() => setCurrentSrc(fallbackSrc)}
      unoptimized
    />
  )
}

interface Props {
  quote: Quote
  onBack: () => void
}

export function QuoteSummaryTab({ quote, onBack }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [expirationDate, setExpirationDate] = useState<string>("")
  const [expirationTime, setExpirationTime] = useState<string>("")
  const [copied, setCopied] = useState(false)

  // ✅ Fallback URL
  const quoteUrl =
    publishedUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/q/${quote.magic_link_slug}`

  /* ---------------- 💰 Totals ---------------- */
  const totalOptions = useMemo(() => {
    if (!quote.options?.length) return 0
    return quote.options.reduce((sum, o) => {
      const total =
        (Number(o.cost_operator) || 0) +
        (Number(o.price_commission) || 0) +
        (Number(o.price_base) || 0) +
        (Number(o.price_fet) || 0) +
        (Number(o.price_extras_total) || 0) +
        (Number(o.price_taxes) || 0)
      return sum + total
    }, 0)
  }, [quote.options])

  const totalServices = useMemo(() => {
    if (!quote.services?.length) return 0
    return quote.services.reduce(
      (sum, s) => sum + (Number(s.amount) || Number(s.unit_price) || 0) * (Number(s.qty) || 1),
      0
    )
  }, [quote.services])

  const grandTotal = totalOptions + totalServices

  // ✅ Validate expiration date/time
  const isExpirationValid = Boolean(expirationDate && expirationTime)
  const expirationDateTime = useMemo(() => {
    if (!expirationDate || !expirationTime) return null
    const [year, month, day] = expirationDate.split("-").map(Number)
    const [hours, minutes] = expirationTime.split(":").map(Number)

    if (
      [year, month, day, hours, minutes].some((value) => Number.isNaN(value)) ||
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day) ||
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes)
    ) {
      return null
    }

    const localDate = new Date()
    localDate.setFullYear(year, month - 1, day)
    localDate.setHours(hours, minutes, 0, 0)
    return localDate.toISOString()
  }, [expirationDate, expirationTime])

  /* ---------------- 🚀 Publish quote ---------------- */
  const handlePublish = async () => {
    // Validate expiration date/time before publishing
    if (!isExpirationValid) {
      toast({
        title: "Expiration Required",
        description: "Please set an expiration date and time before publishing the quote.",
        variant: "destructive",
      })
      return
    }
    setPublishing(true)
    try {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-action-link`
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")

      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          action_type: "quote",
          email: quote.contact_email,
          tenant_id: quote.tenant_id,
          created_by: quote.created_by_user_id,
          metadata: { 
            quote_id: quote.id, 
            quote_ref: quote.reference_code,
            expiration_date: expirationDateTime
          },
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        console.error("Publish failed response:", json)
        throw new Error(json.error || `Failed (${res.status})`)
      }

      // If publish is successful (200 status), update quote status and timestamps
      let statusUpdated = false
      if (res.status === 200) {
        try {
          const updateRes = await fetch(`/api/quotes/${quote.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              status: "awaiting response",
              sent_at: new Date().toISOString(), // Set sent_at to current timestamp
              valid_until: expirationDateTime, // Set valid_until to the expiration date/time
            }),
          })

          if (updateRes.ok) {
            statusUpdated = true
            console.log("✅ Quote status updated to 'awaiting response'")
            console.log("✅ Quote sent_at and valid_until updated")
          } else {
            const errorData = await updateRes.json().catch(() => ({}))
            console.error("❌ Failed to update quote status:", updateRes.status, errorData)
          }
        } catch (updateErr) {
          console.error("❌ Error updating quote status:", updateErr)
          // Don't throw here - the publish was successful
        }
      }

      const linkUrl = json.link || json.link_url || null
      setPublishedUrl(linkUrl)
      
      // Show success toast with status update confirmation
      console.log("🎉 Showing success toast for quote publish")
      toast({
        title: "Quote Published Successfully!",
        description: statusUpdated 
          ? "Your client has been emailed a secure link to view and confirm the quote. Quote status updated to 'awaiting response'."
          : "Your client has been emailed a secure link to view and confirm the quote. Status update pending.",
      })

      // Don't redirect automatically - let user copy the link first
    } catch (err: any) {
      console.error("Publish error:", err)
      toast({
        title: "Failed to publish quote",
        description: err.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setPublishing(false)
    }
  }

  useEffect(() => {
    const baseline = addHours(new Date(), 24)
    setExpirationDate(toDateInputValue(baseline))
    setExpirationTime(toTimeInputValue(baseline))
  }, [quote?.id])

  useEffect(() => {
    if (!quote?.options?.length) return
    // Note: Aircraft data is already in quote options
    // No need to fetch separately
  }, [quote?.options])

  const handleCopyLink = async () => {
    if (!publishedUrl) return
    
    try {
      await navigator.clipboard.writeText(publishedUrl)
      setCopied(true)
      toast({
        title: "Link Copied!",
        description: "The quote link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
      toast({
        title: "Copy Failed",
        description: "Failed to copy link. Please try selecting and copying manually.",
        variant: "destructive",
      })
    }
  }

  /* ---------------- 🧾 Render ---------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Summary & Publish
        </CardTitle>
        <CardDescription>
          Review all quote details before publishing.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Contact</h3>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p>{quote.contact_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{quote.contact_email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{quote.contact_phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Company</p>
              <p>{quote.contact_company || "—"}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Trip Itinerary */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Trip Itinerary
          </h3>
          {quote.legs?.length ? (
            <div className="space-y-3">
              {quote.legs.map((leg: any, i: number) => (
                <div
                  key={leg.id || i}
                  className="border p-4 rounded-lg bg-muted/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">
                        {leg.origin || leg.origin_code || "?"} → {leg.destination || leg.destination_code || "?"}
                      </p>
                      <p className="text-muted-foreground text-sm mt-1">
                        {leg.departureDate || leg.depart_dt || "No date"} at{" "}
                        {leg.departureTime || leg.depart_time || "No time"}
                      </p>
                      {leg.notes && (
                        <p className="text-muted-foreground text-xs mt-1 italic">
                          {leg.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">
                        {leg.passengers || leg.pax_count || 0} passengers
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No trip legs defined.
            </p>
          )}
        </div>

        <Separator />

        {/* Aircraft Options */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Aircraft Options
          </h3>

          {!quote?.options?.length ? (
            <p className="text-muted-foreground text-sm">No aircraft options added.</p>
          ) : (
            <div className="space-y-4">
              {quote.options.map((option: any, i: number) => {
                const total =
                  (Number(option?.cost_operator) || 0) +
                  (Number(option?.price_commission) || 0) +
                  (Number(option?.price_base) || 0) +
                  (Number(option?.price_fet) || 0) +
                  (Number(option?.price_extras_total) || 0) +
                  (Number(option?.price_taxes) || 0)

                // Use the aircraft data that comes from the API
                const aircraftModel = option?.aircraftModel
                const aircraftTail = option?.aircraftTail
                const amenities = option?.selectedAmenities || []
              const fallbackLabel = aircraftModel?.name || option.label || `Option ${i + 1}`
              const optionImages = collectOptionImages(option, fallbackLabel)

                return (
                  <div
                    key={option.id ?? i}
                    className="border rounded-lg bg-muted/30 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-4 border-b bg-muted/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {option.label || `Option ${i + 1}`}
                          </h4>
                          {option.notes && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {option.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(total)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {option.flight_hours || 0} flight hours
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Aircraft Details */}
                    <div className="p-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Aircraft Info */}
                        <div>
                          <h5 className="font-medium mb-3 flex items-center gap-2">
                            <Plane className="h-4 w-4" />
                            Aircraft Details
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Model:</span>
                              <span className="ml-2 font-medium">
                                {aircraftModel?.manufacturer ? `${aircraftModel.manufacturer} ${aircraftModel.name}` : aircraftModel?.name || "Unknown Model"}
                              </span>
                            </div>
                            {aircraftTail?.tailNumber && (
                              <div>
                                <span className="text-muted-foreground">Tail Number:</span>
                                <span className="ml-2 font-medium">
                                  {aircraftTail.tailNumber}
                                </span>
                              </div>
                            )}
                            {(aircraftTail?.operator || aircraftTail?.operator_id) && (
                              <div>
                                <span className="text-muted-foreground">Operator:</span>
                                <span className="ml-2 font-medium">
                                  {aircraftTail.operator || aircraftTail.operator_id}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Capacity:</span>
                              <span className="ml-2 font-medium">
                                {aircraftTail?.capacityOverride || aircraftTail?.capacity_pax || aircraftModel?.defaultCapacity || aircraftModel?.size_code || "N/A"} passengers
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Range:</span>
                              <span className="ml-2 font-medium">
                                {aircraftTail?.rangeNmOverride || aircraftTail?.range_nm || aircraftModel?.defaultRangeNm || "N/A"} nm
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amenities */}
                        <div>
                          <h5 className="font-medium mb-3 flex items-center gap-2">
                            <Coffee className="h-4 w-4" />
                            Amenities
                          </h5>
                          {amenities.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {amenities.map((amenity: any, idx: number) => {
                                const amenityName = typeof amenity === 'string' ? amenity : amenity.name
                                const amenityIcon = typeof amenity === 'object' ? amenity.icon_ref : null
                                
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                                  >
                                    {amenityIcon ? (
                                      <span className="text-xs">{amenityIcon}</span>
                                    ) : (
                                      <Wifi className="h-3 w-3" />
                                    )}
                                    {amenityName}
                                  </span>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">No amenities selected</p>
                          )}
                        </div>
                      </div>

                      {/* Image Gallery */}
                      {optionImages.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-3">Aircraft Images</h5>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {optionImages.map((imageSrc, idx: number) => (
                              <div
                                key={`${option.id ?? i}-${idx}`}
                                className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden border"
                              >
                                <OptionImageThumbnail
                                  src={imageSrc}
                                  alt={`${fallbackLabel} image ${idx + 1}`}
                                  fallbackLabel={fallbackLabel}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing Breakdown */}
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-medium mb-3">Pricing Breakdown</h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Operator Cost:</span>
                            <span>{formatCurrency(option.cost_operator || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission:</span>
                            <span>{formatCurrency(option.price_commission || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Price:</span>
                            <span>{formatCurrency(option.price_base || 0)}</span>
                          </div>
                          {(option.price_fet || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Federal Excise Tax (FET):</span>
                              <span>{formatCurrency(option.price_fet || 0)}</span>
                            </div>
                          )}
                          {(option.price_extras_total || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">US Domestic Segment Fee:</span>
                              <span>{formatCurrency(option.price_extras_total || 0)}</span>
                            </div>
                          )}
                          {(option.price_taxes || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">US International Head Tax:</span>
                              <span>{formatCurrency(option.price_taxes || 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold col-span-2 pt-2 border-t">
                            <span>Total:</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>


        <Separator />

        {/* Services */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Additional Services
          </h3>
          {quote.services?.length ? (
            <div className="space-y-3">
              {quote.services.map((service: any, i: number) => {
                const totalAmount = (Number(service.amount) || Number(service.unit_price) || 0) * (Number(service.qty) || 1)
                return (
                  <div
                    key={service.id || i}
                    className="border p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-base">
                          {service.description || service.name || "Service"}
                        </h4>
                        {service.notes && (
                          <p className="text-muted-foreground text-sm mt-1">
                            {service.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Qty: {service.qty || 1}</span>
                          <span>Unit Price: {formatCurrency(service.amount || service.unit_price || 0)}</span>
                          {service.taxable && (
                            <span className="text-amber-600 font-medium">Taxable</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {formatCurrency(totalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No services added.</p>
          )}
        </div>

        <Separator />

        {/* Expiration Settings */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quote Expiration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="expiration-date">Expiration Date *</Label>
              <DateTimePicker
                date={expirationDate}
                onDateChange={setExpirationDate}
                showOnlyDate
                placeholder="Select expiration date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration-time">Expiration Time *</Label>
              <DateTimePicker
                time={expirationTime}
                onTimeChange={setExpirationTime}
                showOnlyTime
                placeholder="Select expiration time"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The quote will expire and become invalid after this date and time.
          </p>
          {!isExpirationValid && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Please set both date and time to enable publishing.
            </p>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">
            Aircraft Options Total: {formatCurrency(totalOptions)}
          </p>
          <p className="text-sm text-muted-foreground">
            Additional Services Total: {formatCurrency(totalServices)}
          </p>
          <p className="text-lg font-semibold">
            Grand Total: {formatCurrency(grandTotal)}
          </p>
        </div>

        <Separator />

        {/* Published Link Section */}
        {publishedUrl && (
          <>
            <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-primary">Quote Link Generated</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Copy and share this link with your client. They can use it to view and confirm the quote.
                  </p>
                  <div className="flex items-center gap-2 p-2 bg-background border rounded-md">
                    <code className="flex-1 text-xs break-all text-muted-foreground font-mono">
                      {publishedUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyLink}
                      className="flex-shrink-0"
                      title="Copy link"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Services
          </Button>

          <div className="flex items-center gap-3">
            {publishedUrl ? (
              <Button 
                onClick={() => router.push("/leads")}
                variant="default"
              >
                Done
              </Button>
            ) : (
              <Button 
                onClick={handlePublish} 
                disabled={publishing || !isExpirationValid}
                title={!isExpirationValid ? "Please set an expiration date and time before publishing" : ""}
              >
                <Send className="mr-2 h-4 w-4" />
                {publishing ? "Publishing..." : !isExpirationValid ? "Set Expiration First" : "Publish Quote"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
