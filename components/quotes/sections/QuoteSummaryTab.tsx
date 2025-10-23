"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Clipboard,
  ExternalLink,
  Check,
  FileText,
  ChevronRight,
  Send,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import type { Quote } from "@/lib/types"

interface Props {
  quote: Quote
  onBack: () => void
}

export function QuoteSummaryTab({ quote, onBack }: Props) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

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

  /* ---------------- 📋 Copy link ---------------- */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quoteUrl)
      setCopied(true)
      toast({ title: "Copied!", description: "Quote link copied to clipboard." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy manually.",
        variant: "destructive",
      })
    }
  }

  /* ---------------- 🌐 Open link ---------------- */
  const handleOpen = () => {
    window.open(quoteUrl, "_blank", "noopener,noreferrer")
  }

  /* ---------------- 🚀 Publish quote ---------------- */
  const handlePublish = async () => {
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
          metadata: { quote_id: quote.id, quote_ref: quote.reference_code },
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        console.error("Publish failed response:", json)
        throw new Error(json.error || `Failed (${res.status})`)
      }

      setPublishedUrl(json.link || json.link_url || null)
      toast({
        title: "Quote Published!",
        description:
          "Your client has been emailed a secure link to view and confirm the quote.",
      })
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
  {quote.options?.length ? (
    <ul className="space-y-2 text-sm">
      {quote.options.map((o, i) => {
        const optionTotal =
          (Number(o.cost_operator) || 0) +
          (Number(o.price_commission) || 0) +
          (Number(o.price_taxes) || 0)

        return (
          <li
            key={o.id || i}
            className="border p-4 rounded-md bg-muted/30 flex justify-between items-center"
          >
            {/* Left side: info */}
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
                {o.aircraft_manufacturer || "—"}{" "}
                {o.aircraft_model || ""}{" "}
                {o.aircraft_tail ? `(${o.aircraft_tail})` : ""}
              </span>
              {o.operator_name && (
                <span className="text-muted-foreground text-xs">
                  Operated by {o.operator_name}
                </span>
              )}
            </div>

            {/* Right side: total */}
            <span className="text-base font-semibold">
              {formatCurrency(optionTotal)}
            </span>
          </li>
        )
      })}
    </ul>
  ) : (
    <p className="text-muted-foreground text-sm">
      No aircraft options added.
    </p>
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

        {/* Totals */}
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">
            Flight Options Total: {formatCurrency(totalOptions)}
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
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Clipboard className="mr-2 h-4 w-4" /> Copy Link
                </>
              )}
            </Button>

            <Button onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" /> Open Quote
            </Button>

            <Button onClick={handlePublish} disabled={publishing}>
              <Send className="mr-2 h-4 w-4" />
              {publishing ? "Publishing..." : "Publish Quote"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
