"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  User,
  Plane,
  FileText,
  Receipt,
  ExternalLink,
  StickyNote,
  CreditCard,
  LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge"
import { useToast } from "@/hooks/use-toast"

// invoice_detail table schema fields
interface InvoiceDetailItem {
  id: string
  invoice_id: string
  seq: number
  label: string
  description?: string | null
  qty: number
  unit_price: number
  amount: number // Generated column: qty * unit_price
  type: string
  taxable: boolean
  tax_rate?: number | null
  tax_amount: number
  created_at?: string | null
  updated_at?: string | null
}

interface QuoteOption {
  id: string
  aircraft_id?: string
  cost_operator?: number
  price_base?: number
  price_total?: number
  notes?: string | null
}

// invoice table schema fields (all fields from schema)
interface Invoice {
  id: string
  tenant_id: string
  quote_id: string
  selected_option_id: string
  number: string
  issued_at: string
  due_at?: string | null
  amount: number
  currency: string
  status: string
  external_payment_url?: string | null
  summary_itinerary?: string | null
  aircraft_label?: string | null
  breakdown_json?: any | null
  notes?: string | null
  created_at: string
  updated_at: string
  subtotal?: number | null
  tax_total?: number | null
  // Related data (from joins)
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
  const router = useRouter()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoice/${id}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch invoice: ${response.status}`)
        }

        const data = await response.json()
        const invoiceData = data.invoice

        if (!invoiceData) {
          throw new Error("Invoice not found")
        }

        setInvoice(invoiceData)
      } catch (err: any) {
        console.error("❌ Error loading invoice:", err)
        toast({
          title: "Error loading invoice",
          description: err.message || "Could not fetch invoice.",
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
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading invoice...
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-[75vw]">
          <Card className="shadow-lg max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Invoice not found</h3>
                <p>This invoice may have been deleted or does not exist.</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="w-full lg:w-[75vw] space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoice {invoice.number}</h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Issued {formatDate(invoice.issued_at)} • {formatTimeAgo(invoice.issued_at)}
            </p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="grid gap-4 sm:gap-6">
          <Card className="shadow-md border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl">Invoice Details</CardTitle>
              <CardDescription>Complete breakdown and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {invoice.details && invoice.details.length > 0 ? (
                <>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Line Items
                    </h3>
                    <div className="overflow-x-auto overflow-y-auto max-w-full max-h-[500px] border rounded-lg shadow-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead className="min-w-[200px]">Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right min-w-[100px]">Unit Price</TableHead>
                            <TableHead className="text-right">Tax</TableHead>
                            <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoice.details.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-mono text-xs text-muted-foreground">{item.seq}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                                )}
                                {item.type && (
                                  <Badge variant="outline" className="text-xs mt-1.5">
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

                  <div className="space-y-3 bg-muted/30 p-4 sm:p-6 rounded-lg">
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
                    <div className="flex justify-between text-lg sm:text-xl font-bold pt-2">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatAmountWithCurrency(invoice.amount, invoice.currency)}</span>
                    </div>
                  </div>

                  <Separator />
                </>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 sm:p-8 shadow-sm">
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Total Amount</p>
                      <p className="text-3xl sm:text-4xl font-bold text-primary mb-4">
                        {formatAmountWithCurrency(invoice.amount, invoice.currency)}
                      </p>
                      {invoice.subtotal !== undefined && invoice.subtotal !== invoice.amount && (
                        <div className="mt-4 space-y-2 text-sm">
                          {invoice.subtotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-medium">
                                {formatAmountWithCurrency(invoice.subtotal, invoice.currency)}
                              </span>
                            </div>
                          )}
                          {invoice.tax_total && invoice.tax_total > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tax:</span>
                              <span className="font-medium">
                                {formatAmountWithCurrency(invoice.tax_total, invoice.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <DollarSign className="absolute right-6 bottom-6 h-20 w-20 sm:h-24 sm:w-24 text-primary/10" />
                  </div>

                  <Separator />
                </>
              )}

              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Customer Information
                </h3>
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {invoice.quote?.contact_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "—"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base truncate">{invoice.quote?.contact_name || "—"}</p>
                    {invoice.quote?.contact_email && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{invoice.quote.contact_email}</p>
                    )}
                    {invoice.quote?.contact_company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{invoice.quote.contact_company}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Important Dates
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Issued Date</span>
                    <span className="font-medium text-sm sm:text-base">{formatDate(invoice.issued_at)}</span>
                  </div>
                  {invoice.due_at && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-muted-foreground">Due Date</span>
                      <span className="font-medium text-sm sm:text-base">{formatDate(invoice.due_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {(invoice.external_payment_url || invoice.quote?.id) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      Quick Actions
                    </h3>
                    <div className="space-y-4">
                      {invoice.external_payment_url && (
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            Payment Portal URL
                          </p>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border text-sm font-mono break-all">
                            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <a
                              href={invoice.external_payment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {invoice.external_payment_url}
                            </a>
                          </div>
                        </div>
                      )}

                      {invoice.quote?.id && (
                        <div>
                          {invoice.quote.title && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Related Quote: <span className="font-medium text-foreground">{invoice.quote.title}</span>
                            </p>
                          )}
                          <Button
                            size="default"
                            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
                            asChild
                          >
                            <Link href={`/quotes/${invoice.quote.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Quote
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {invoice.selected_option && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <Plane className="h-5 w-5 text-primary" />
                      Selected Aircraft Option
                    </h3>
                    <div className="space-y-2 text-sm bg-muted/30 p-4 rounded-lg">
                      {invoice.selected_option.price_total && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Option Total:</span>
                          <span className="font-medium">
                            {formatAmountWithCurrency(invoice.selected_option.price_total, invoice.currency)}
                          </span>
                        </div>
                      )}
                      {invoice.selected_option.cost_operator && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Operator Cost:</span>
                          <span className="font-medium">
                            {formatAmountWithCurrency(invoice.selected_option.cost_operator, invoice.currency)}
                          </span>
                        </div>
                      )}
                      {invoice.selected_option.price_base && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Price:</span>
                          <span className="font-medium">
                            {formatAmountWithCurrency(invoice.selected_option.price_base, invoice.currency)}
                          </span>
                        </div>
                      )}
                      {invoice.selected_option.notes && (
                        <div className="mt-3 p-3 bg-background rounded-lg border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm whitespace-pre-line">{invoice.selected_option.notes}</p>
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
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Itinerary Summary
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line p-4 bg-muted/30 rounded-lg">
                      {invoice.summary_itinerary}
                    </p>
                  </div>
                </>
              )}

              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
                      <StickyNote className="h-5 w-5 text-primary" />
                      Notes
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line p-4 bg-muted/30 rounded-lg border border-border/50">
                      {invoice.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
