"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Clipboard, ExternalLink, Check, FileText, ChevronRight } from "lucide-react"
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
  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/q/${quote.magic_link_slug}`

  // --- COMPUTE TOTALS ---
  const totalOptions = quote.options?.length
    ? quote.options.reduce((sum, o) => {
        const base =
          (o.operatorCost || 0) +
          (o.commission || 0) +
          (o.feesEnabled
            ? o.fees?.reduce((s, f) => s + (f.amount || 0), 0)
            : 0)
        return sum + base
      }, 0)
    : 0

  const totalServices = quote.services?.reduce((s, v) => s + (v.amount || 0), 0) || 0
  const grandTotal = totalOptions + totalServices

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

  const handleOpen = () => {
    window.open(quoteUrl, "_blank")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Summary & Publish
        </CardTitle>
        <CardDescription>Review all details before publishing your quote.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Contact Info */}
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

        {/* Trip Legs */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Trip Itinerary</h3>
          {quote.legs?.length ? (
            <ul className="space-y-2 text-sm">
              {quote.legs.map((leg, i) => (
                <li key={i} className="border p-3 rounded-md bg-muted/30">
                  <p>
                    <span className="font-medium">
                      {leg.origin || "?"} → {leg.destination || "?"}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {leg.departureDate || "No date"} at {leg.departureTime || "No time"} —{" "}
                    {leg.passengers || 0} pax
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No trip legs defined.</p>
          )}
        </div>

        <Separator />

        {/* Options */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Aircraft Options</h3>
          {quote.options?.length ? (
            <ul className="space-y-4">
              {quote.options.map((opt, i) => {
                const total =
                  (opt.operatorCost || 0) +
                  (opt.commission || 0) +
                  (opt.feesEnabled
                    ? opt.fees?.reduce((s, f) => s + (f.amount || 0), 0)
                    : 0)
                return (
                  <li key={i} className="p-4 border rounded-md bg-muted/20">
                    <p className="font-medium mb-1">
                      {opt.aircraft_manufacturer || ""} {opt.aircraft_model || ""}
                    </p>
                    <p className="text-muted-foreground text-xs mb-1">
                      {opt.aircraft_tail_number
                        ? `Tail ${opt.aircraft_tail_number}`
                        : "No tail assigned"}
                    </p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(total)}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No aircraft options selected.</p>
          )}
        </div>

        <Separator />

        {/* Services */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Additional Services</h3>
          {quote.services?.length ? (
            <ul className="space-y-3">
              {quote.services.map((s, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center p-3 border rounded-md bg-muted/20 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-muted-foreground">{s.description}</p>
                  </div>
                  <p>{formatCurrency(s.amount || 0)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No additional services added.</p>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">
            Options Total: {formatCurrency(totalOptions)}
          </p>
          <p className="text-sm text-muted-foreground">
            Services Total: {formatCurrency(totalServices)}
          </p>
          <p className="text-lg font-semibold">
            Grand Total: {formatCurrency(grandTotal)}
          </p>
        </div>

        <Separator />

        {/* Publish / Copy */}
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
