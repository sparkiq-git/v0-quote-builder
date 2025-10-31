"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Plus,
  FileText,
  Eye,
  Search,
  Trash2,
  Loader2,
  Send,
  FileSignature,
  ArrowUpDown,
  Filter,
  MoreHorizontal,
} from "lucide-react"
import { formatDate, formatTimeAgo, formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteQuote, getQuoteById } from "@/lib/supabase/queries/quotes"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)
  const [invoiceContractOpen, setInvoiceContractOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null)
  const [fullQuoteData, setFullQuoteData] = useState<any | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState("")
  const [sending, setSending] = useState(false)

  // ✅ Fetch quotes from Supabase (client-side only)
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        // Only run on client side
        if (typeof window === "undefined") return

        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        const { data, error } = await supabase
          .from("quote")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("updated_at", { ascending: false })

        if (error) throw error

        const mapped = data.map((q) => ({
          id: q.id,
          title: q.title || "Untitled Quote",
          status: q.status,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
          expiresAt: q.valid_until,
          openCount: q.open_count || 0,
          customer: {
            name: q.contact_name || "—",
            email: q.contact_email || "",
            phone: q.contact_phone || "",
            company: q.contact_company || "",
          },
          legs: [], // can populate from quote_detail later
          options: [],
          services: [],
        }))
        setQuotes(mapped)
      } catch (err: any) {
        console.error("❌ Error loading quotes:", err)
        toast({
          title: "Failed to load quotes",
          description: err.message || "Could not fetch quotes from Supabase.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [toast])

  const handleDeleteQuote = useCallback((quoteId: string) => {
    setQuoteToDelete(quoteId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDeleteQuote = useCallback(async () => {
    if (!quoteToDelete) return
    try {
      await deleteQuote(quoteToDelete)
      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete))
      toast({
        title: "Quote deleted",
        description: "The quote has been removed successfully.",
      })
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete quote.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
    }
  }, [quoteToDelete, toast])


  // Invoice & Contract handler
  const handleOpenInvoiceContractModal = useCallback(async (quote: any) => {
    setSelectedQuote(quote)
    setPaymentUrl("")
    setFullQuoteData(null)
    setLoadingQuote(true)
    setInvoiceContractOpen(true)

    try {
      // Fetch full quote data with options, items, etc.
      const fullQuote = await getQuoteById(quote.id)
      setFullQuoteData(fullQuote)
    } catch (err: any) {
      console.error("Failed to fetch quote details:", err)
      toast({
        title: "Failed to load quote",
        description: err.message || "Could not load quote details.",
        variant: "destructive",
      })
    } finally {
      setLoadingQuote(false)
    }
  }, [toast])

  const handleSendInvoiceContract = useCallback(async () => {
    if (!selectedQuote) return

    try {
      setSending(true)

      // Only run on client side
      if (typeof window === "undefined") return

      // Call the quote-to-invoice Edge Function via API route
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          quote_id: selectedQuote.id,
          external_payment_url: paymentUrl || null
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create invoice")

      // Show success message
      toast({
        title: "Invoice & Contract created",
        description: `Invoice ${data.data?.invoice?.number || "created"} successfully.`,
      })

      // Update quote status in UI
      setQuotes((prev) => prev.map((q) => (q.id === selectedQuote.id ? { ...q, status: "invoiced" } : q)))

      // Close modal and reset
      setInvoiceContractOpen(false)
      setSelectedQuote(null)
      setFullQuoteData(null)
      setPaymentUrl("")
    } catch (err: any) {
      console.error("Failed to create invoice & contract:", err)
      toast({
        title: "Failed to create invoice",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [selectedQuote, paymentUrl, toast])

  // Check if quote can send invoice & contract
  const canSendInvoiceContract = useCallback((quote: any) => {
    return quote.status === "accepted"
  }, [])

  // ✅ Enhanced filtering with better search experience
  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableFields = [
          quote.title?.toLowerCase() || "",
          quote.customer.name?.toLowerCase() || "",
          quote.customer.email?.toLowerCase() || "",
          quote.customer.company?.toLowerCase() || "",
          quote.status?.toLowerCase() || "",
        ]

        if (!searchableFields.some((field) => field.includes(query))) return false
      }

      return true
    })
  }, [quotes, statusFilter, searchQuery])

  const getStatusBadgeVariant = useCallback((status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "sent":
        return "default"
      case "opened":
        return "default"
      case "accepted":
        return "default"
      case "declined":
        return "destructive"
      case "cancelled":
        return "destructive"
      case "invoiced":
        return "default"
      case "expired":
        return "secondary"
      default:
        return "outline"
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading quotes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">Track quote status and customer responses</p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Quote
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes by title, name, company, email, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes ({filteredQuotes.length})</CardTitle>
          <CardDescription>
            Showing {statusFilter === "all" ? "all" : statusFilter} quotes with real-time updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2 lg:px-3">
                      Quote Details <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2 lg:px-3">
                      Customer <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2 lg:px-3">
                      Status <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2 lg:px-3">
                      Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="h-8 px-2 lg:px-3">
                      Created <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length > 0 ? (
                  filteredQuotes.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{quote.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {quote.customer.company || "No company"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{quote.customer.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{quote.customer.email || "No email"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative inline-block">
                          <Badge variant={getStatusBadgeVariant(quote.status)} className="text-xs">
                            {quote.status}
                          </Badge>
                          {quote.status === "opened" && quote.openCount > 0 && (
                            <div className="absolute -top-3 -right-3 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center w-5 h-5">
                              <span className="text-[0.676875rem] font-medium text-slate-700">{quote.openCount}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{formatDate(quote.updatedAt)}</div>
                          <div className="text-muted-foreground">{formatTimeAgo(quote.updatedAt)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <div>{formatDate(quote.createdAt)}</div>
                          <div className="text-muted-foreground">{formatTimeAgo(quote.createdAt)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/quotes/${quote.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View/Edit
                              </Link>
                            </DropdownMenuItem>
                            {canSendInvoiceContract(quote) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleOpenInvoiceContractModal(quote)}>
                                  <FileSignature className="mr-2 h-4 w-4" />
                                  Invoice & Contract
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteQuote(quote.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Quote
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No quotes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteQuote}>
              Delete Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice & Contract Modal */}
      <Dialog open={invoiceContractOpen} onOpenChange={setInvoiceContractOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice & Contract</DialogTitle>
            <DialogDescription>
              Review the quote summary and create an invoice with contract.
            </DialogDescription>
          </DialogHeader>

          {loadingQuote ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2 h-5 w-5" />
              <span className="text-sm text-muted-foreground">Loading quote details...</span>
            </div>
          ) : selectedQuote && fullQuoteData ? (
            <div className="space-y-4 py-4">
              {/* Customer Information */}
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-base mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{fullQuoteData.contact_name || selectedQuote.customer.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{fullQuoteData.contact_email || selectedQuote.customer.email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{fullQuoteData.contact_company || selectedQuote.customer.company || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Selected Option */}
              {fullQuoteData.options && fullQuoteData.options.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-base mb-3">Selected Aircraft Option</h4>
                  {fullQuoteData.options.map((option: any, idx: number) => (
                    <div key={option.id || idx} className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Option {idx + 1}:</span>
                        <span className="font-medium">
                          {option.aircraftModel?.name || option.aircraftTail?.tailNumber || "Aircraft Option"}
                        </span>
                      </div>
                      {option.price_total && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Price:</span>
                          <span className="font-medium">{formatCurrency(option.price_total || 0)}</span>
                        </div>
                      )}
                      {option.flight_hours && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Flight Hours:</span>
                          <span className="font-medium">{option.flight_hours}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Items/Services */}
              {fullQuoteData.services && fullQuoteData.services.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-base mb-3">Additional Services</h4>
                  <div className="space-y-2">
                    {fullQuoteData.services.map((service: any, idx: number) => (
                      <div key={service.id || idx} className="flex justify-between text-sm">
                        <span>{service.name || service.description || `Service ${idx + 1}`}</span>
                        <span className="font-medium">
                          {formatCurrency((service.amount || service.unit_price || 0) * (service.qty || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                <h4 className="font-semibold text-base mb-3">Totals</h4>
                <div className="space-y-1 text-sm">
                  {fullQuoteData.options && fullQuoteData.options.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aircraft Option:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          fullQuoteData.options.reduce((sum: number, opt: any) => sum + (opt.price_total || 0), 0)
                        )}
                      </span>
                    </div>
                  )}
                  {fullQuoteData.services && fullQuoteData.services.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Additional Services:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          fullQuoteData.services.reduce(
                            (sum: number, s: any) => sum + ((s.amount || s.unit_price || 0) * (s.qty || 1)),
                            0
                          )
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>Grand Total:</span>
                    <span>
                      {formatCurrency(
                        (fullQuoteData.options?.reduce((sum: number, opt: any) => sum + (opt.price_total || 0), 0) || 0) +
                          (fullQuoteData.services?.reduce(
                            (sum: number, s: any) => sum + ((s.amount || s.unit_price || 0) * (s.qty || 1)),
                            0
                          ) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment URL Input */}
              <div className="border rounded-lg p-4 space-y-2">
                <Label htmlFor="payment-url" className="font-semibold text-base">
                  Payment Link (Optional)
                </Label>
                <Input
                  id="payment-url"
                  type="url"
                  placeholder="https://payment.example.com/..."
                  value={paymentUrl}
                  onChange={(e) => setPaymentUrl(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a payment URL that will be included in the invoice.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This will create an invoice from the quote and prepare it for sending to the customer.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load quote details.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setInvoiceContractOpen(false)
              setSelectedQuote(null)
              setFullQuoteData(null)
              setPaymentUrl("")
            }}>
              Cancel
            </Button>
            <Button onClick={handleSendInvoiceContract} disabled={sending || loadingQuote}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Create Invoice & Contract
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
