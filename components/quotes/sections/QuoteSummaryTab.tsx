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
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"

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
      (Number(o.price_taxes) || 0)
    return sum + total
  }, 0)
}, [quote.options])


  const totalServices = useMemo(() => {
    if (!quote.services?.length) return 0
    return quote.services.reduce(
      (sum, s) => sum + (Number(s.amount) || Number(s.unit_price) || 0),
      0
    )
  }, [quote.services])

  const grandTotal = totalOptions + totalServices

  // ✅ Validate expiration date/time
  const isExpirationValid = expirationDate && expirationTime
  const expirationDateTime = isExpirationValid ? `${expirationDate}T${expirationTime}:00.000Z` : null

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
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quote: {
                ...quote,
                status: "awaiting response",
                sent_at: new Date().toISOString(), // Set sent_at to current timestamp
                valid_until: expirationDateTime, // Set valid_until to the expiration date/time
              },
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

      setPublishedUrl(json.link || json.link_url || null)
      
      // Show success toast with status update confirmation
      console.log("🎉 Showing success toast for quote publish")
      toast({
        title: "Quote Published Successfully!",
        description: statusUpdated 
          ? "Your client has been emailed a secure link to view and confirm the quote. Quote status updated to 'awaiting response'."
          : "Your client has been emailed a secure link to view and confirm the quote. Status update pending.",
      })

      // Redirect to leads page after successful publish
      setTimeout(() => {
        router.push("/leads")
      }, 2000) // Give user time to see the success message
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
  if (!quote?.options?.length) return
// Note: Aircraft data is already in quote options
// No need to fetch separately
}, [quote?.options])





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
          <h3 className="text-lg font-semibold mb-2">Trip Itinerary</h3>
          {quote.legs?.length ? (
            <ul className="space-y-2 text-sm">
              {quote.legs.map((leg, i) => (
                <li
                  key={leg.id || i}
                  className="border p-3 rounded-md bg-muted/30"
                >
                  <p className="font-medium">
                    {leg.origin || "?"} → {leg.destination || "?"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {leg.depart_dt || leg.departureDate || "No date"} at{" "}
                    {leg.depart_time || leg.departureTime || "No time"} —{" "}
                    {leg.pax_count || leg.passengers || 0} pax
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No trip legs defined.
            </p>
          )}
        </div>

        <Separator />

        {/* Aircraft Options */}
<div>
  <h3 className="text-lg font-semibold mb-2">Aircraft Options</h3>

  {!quote?.options?.length ? (
    <p className="text-muted-foreground text-sm">No aircraft options added.</p>
  ) : (
    <ul className="space-y-2 text-sm">
      {quote.options.map((o: any, i: number) => {
        const total =
          (Number(o?.cost_operator) || 0) +
          (Number(o?.price_commission) || 0) +
          (Number(o?.price_taxes) || 0)

        // Use aircraft data from the option (embedded by API)
        const aircraftModel = o?.aircraftModel
        const aircraftTail = o?.aircraftTail
        const line1 = aircraftModel?.name ? `${aircraftModel.name}`.trim() : "—"
        const tail = aircraftTail?.tailNumber ? `(${aircraftTail.tailNumber})` : ""
        const operatorLine = aircraftTail?.operator ? `Operated by ${aircraftTail.operator}` : ""

        return (
          <li
            key={o.id ?? i}
            className="border p-4 rounded-md bg-muted/30 flex justify-between items-center"
          >
            <div className="flex flex-col">
              <span className="font-medium text-base">
                {o.label || `Option ${i + 1}`}
              </span>
              {o.notes && (
                <span className="text-muted-foreground text-xs mb-1">
                  {o.notes}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {line1} {tail}
              </span>
              {operatorLine && (
                <span className="text-muted-foreground text-xs">
                  {operatorLine}
                </span>
              )}
            </div>

            <span className="text-base font-semibold">
              {formatCurrency(total)}
            </span>
          </li>
        )
      })}
    </ul>
  )}
</div>


        <Separator />

        {/* Services */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Additional Services</h3>
          {quote.services?.length ? (
            <ul className="space-y-2 text-sm">
              {quote.services.map((s, i) => (
                <li
                  key={s.id || i}
                  className="border p-3 rounded-md bg-muted/30 flex justify-between"
                >
                  <span>
                    <span className="font-medium">
                      {s.description || "Service"}
                    </span>
                    {s.taxable && (
                      <span className="text-xs text-muted-foreground block">
                        Taxable
                      </span>
                    )}
                  </span>
                  <span>{formatCurrency(s.amount || 0)}</span>
                </li>
              ))}
            </ul>
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

        {/* Actions */}
        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={onBack}>
            <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Back: Services
          </Button>

          <div className="flex items-center gap-3">
            <Button 
              onClick={handlePublish} 
              disabled={publishing || !isExpirationValid}
              title={!isExpirationValid ? "Please set an expiration date and time before publishing" : ""}
            >
              <Send className="mr-2 h-4 w-4" />
              {publishing ? "Publishing..." : !isExpirationValid ? "Set Expiration First" : "Publish Quote"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
