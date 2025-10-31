"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft, Calendar, DollarSign, Building2, User, Plane, FileText, Receipt, ExternalLink, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatTimeAgo, formatCurrency } from "@/lib/utils/format"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge"
import { useToast } from "@/hooks/use-toast"

interface InvoiceDetailItem {
  id: string
  seq: number
  label: string
  description?: string
  qty: number
  unit_price: number
  amount: number
  type: string
  taxable: boolean
  tax_rate?: number
  tax_amount: number
}

interface QuoteOption {
  id: string
  aircraft_id?: string
  flight_hours?: number
  cost_operator?: number
  price_commission?: number
  price_base?: number
  price_total?: number
  notes?: string
  conditions?: string
}

interface Invoice {
  id: string
  number: string
  status: string
  issued_at: string
  due_at?: string
  amount: number
  currency: string
  subtotal?: number
  tax_total?: number
  aircraft_label?: string
  summary_itinerary?: string
  external_payment_url?: string
  notes?: string
  breakdown_json?: any
  quote?: {
    id: string
    title?: string
    contact_name?: string
    contact_email?: string
    contact_company?: string
  }
  selected_option?: QuoteOption
  details?: InvoiceDetailItem[]
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        
        // Fetch invoice with related data
        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoice")
          .select(`
            id,
            number,
            status,
            issued_at,
            due_at,
            amount,
            currency,
            subtotal,
            tax_total,
            aircraft_label,
            summary_itinerary,
            external_payment_url,
            notes,
            breakdown_json,
            quote:quote_id(
              id,
              title,
              contact_name,
              contact_email,
              contact_company
            ),
            selected_option:selected_option_id(
              id,
              aircraft_id,
              flight_hours,
              cost_operator,
              price_commission,
              price_base,
              price_total,
              notes,
              conditions
            )
          `)
          .eq("id", id)
          .eq("tenant_id", tenantId)
          .single()

        if (invoiceError) throw invoiceError
        if (!invoiceData) throw new Error("Invoice not found")

        // Fetch invoice detail line items
        const { data: detailItems, error: detailError } = await supabase
          .from("invoice_detail")
          .select("*")
          .eq("invoice_id", id)
          .order("seq", { ascending: true })

        if (detailError) {
          console.warn("⚠️ Error fetching invoice details:", detailError)
        }

        // Combine invoice and details
        const invoice: Invoice = {
          ...invoiceData,
          details: detailItems || [],
        }

        setInvoice(invoice)
      } catch (err: any) {
        console.error("❌ Error loading invoice:", err)
        toast({
          title: "Error loading invoice",
          description: err.message || "Could not fetch invoice from Supabase.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchInvoice()
  }, [id, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading invoice...
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Invoice not found or deleted.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Format currency with code
  const formatAmountWithCurrency = (amount: number, currency: string) => {
    if (isNaN(amount) || amount == null) return "$0"
    const currencyCode = currency?.toUpperCase() || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice {invoice.number}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Issued on {formatDate(invoice.issued_at)} • {formatTimeAgo(invoice.issued_at)}
            </p>
          </div>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Main Invoice Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Complete invoice information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Line Items Table */}
            {invoice.details && invoice.details.length > 0 ? (
              <>
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Line Items
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.details.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {item.seq}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.label}</div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </div>
                              )}
                              {item.type && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.type}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{item.qty}</TableCell>
                            <TableCell className="text-right">
                              {formatAmountWithCurrency(item.unit_price, invoice.currency)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.taxable && item.tax_amount > 0 ? (
                                <span className="text-sm">
                                  {formatAmountWithCurrency(item.tax_amount, invoice.currency)}
                                  {item.tax_rate ? ` (${item.tax_rate}%)` : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmountWithCurrency(item.amount, invoice.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Summary Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {formatAmountWithCurrency(invoice.subtotal || 0, invoice.currency)}
                    </span>
                  </div>
                  {invoice.tax_total && invoice.tax_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax Total</span>
                      <span className="font-medium">
                        {formatAmountWithCurrency(invoice.tax_total, invoice.currency)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>{formatAmountWithCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                </div>

                <Separator />
              </>
            ) : (
              <>
                {/* Amount Section (when no line items) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold mt-1">
                      {formatAmountWithCurrency(invoice.amount, invoice.currency)}
                    </p>
                    {invoice.subtotal !== undefined && invoice.subtotal !== invoice.amount && (
                      <div className="mt-2 space-y-1 text-sm">
                        {invoice.subtotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>{formatAmountWithCurrency(invoice.subtotal, invoice.currency)}</span>
                          </div>
                        )}
                        {invoice.tax_total && invoice.tax_total > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax:</span>
                            <span>{formatAmountWithCurrency(invoice.tax_total, invoice.currency)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DollarSign className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>

                <Separator />
              </>
            )}

            {/* Customer Information */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {invoice.quote?.contact_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "—"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {invoice.quote?.contact_name || "—"}
                    </p>
                    {invoice.quote?.contact_email && (
                      <p className="text-sm text-muted-foreground">
                        {invoice.quote.contact_email}
                      </p>
                    )}
                    {invoice.quote?.contact_company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {invoice.quote.contact_company}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Important Dates
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Issued Date</span>
                  <span className="font-medium">{formatDate(invoice.issued_at)}</span>
                </div>
                {invoice.due_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Due Date</span>
                    <span className="font-medium">{formatDate(invoice.due_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Option Information */}
            {invoice.selected_option && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Selected Aircraft Option
                  </h3>
                  <div className="space-y-2 text-sm">
                    {invoice.selected_option.flight_hours && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Flight Hours:</span>
                        <span className="font-medium">{invoice.selected_option.flight_hours}</span>
                      </div>
                    )}
                    {invoice.selected_option.price_total && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Option Total:</span>
                        <span className="font-medium">
                          {formatAmountWithCurrency(invoice.selected_option.price_total, invoice.currency)}
                        </span>
                      </div>
                    )}
                    {invoice.selected_option.notes && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm whitespace-pre-line">{invoice.selected_option.notes}</p>
                      </div>
                    )}
                    {invoice.selected_option.conditions && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Conditions:</p>
                        <p className="text-sm whitespace-pre-line">{invoice.selected_option.conditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {invoice.summary_itinerary && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Itinerary Summary
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {invoice.summary_itinerary}
                  </p>
                </div>
              </>
            )}

            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Notes
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Invoice Number</p>
              <p className="font-mono font-medium">{invoice.number}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <InvoiceStatusBadge status={invoice.status} />
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Issued Date
              </p>
              <p className="font-medium">{formatDate(invoice.issued_at)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimeAgo(invoice.issued_at)}
              </p>
            </div>

            {invoice.due_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Due Date</p>
                <p className="font-medium">{formatDate(invoice.due_at)}</p>
              </div>
            )}

            <Separator />

            {invoice.aircraft_label && (
              <div>
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Aircraft
                </p>
                <p className="font-medium">{invoice.aircraft_label}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground mb-2">Currency</p>
              <p className="font-medium">{invoice.currency?.toUpperCase() || "USD"}</p>
            </div>

            {invoice.quote?.id && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Related Quote</p>
                {invoice.quote.title ? (
                  <p className="font-medium text-sm">{invoice.quote.title}</p>
                ) : (
                  <p className="font-mono text-sm">{invoice.quote.id.slice(0, 8)}...</p>
                )}
                <Button variant="link" size="sm" className="px-0 mt-1" asChild>
                  <Link href={`/quotes/${invoice.quote.id}`}>View Quote →</Link>
                </Button>
              </div>
            )}

            {invoice.external_payment_url && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Payment URL
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <a
                      href={invoice.external_payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Payment Link
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

