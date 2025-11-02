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
  User,
  Building2,
  Mail,
  Phone,
  Plane,
  Clock,
  DollarSign,
  Package,
  LinkIcon,
  CheckCircle2,
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
  const handleOpenInvoiceContractModal = useCallback(
    async (quote: any) => {
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
    },
    [toast],
  )

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
          external_payment_url: paymentUrl || null,
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

      <Dialog open={invoiceContractOpen} onOpenChange={setInvoiceContractOpen}>
        <DialogContent className="w-[60vw] sm:max-w-[92vw] md:max-w-[60vw]lg:max-w-[600] max-h-[95vh] p-5 flex flex-col overflow-hidden bg-white/95 ark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <FileSignature className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Create Invoice & Contract
                </DialogTitle>
                <DialogDescription className="text-base mt-1 text-slate-600 dark:text-slate-400">
                  Review the quote summary and generate an invoice with contract
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-6 px-1">
            {loadingQuote ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <Loader2 className="animate-spin h-12 w-12 text-slate-600 dark:text-slate-400" />
                  <div className="absolute inset-0 blur-xl bg-slate-500/20 animate-pulse" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Loading quote details...</span>
              </div>
            ) : selectedQuote && fullQuoteData ? (
              <div className="space-y-6">
                {/* Customer Information Card */}
                <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Customer Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <User className="h-4 w-4 text-slate-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Name</span>
                          <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                            {fullQuoteData.contact_name || selectedQuote.customer.name || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Email</span>
                          <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                            {fullQuoteData.contact_email || selectedQuote.customer.email || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone</span>
                          <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                            {fullQuoteData.contact_phone || selectedQuote.customer.phone || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <Building2 className="h-4 w-4 text-slate-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Company</span>
                          <p className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                            {fullQuoteData.contact_company || selectedQuote.customer.company || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Aircraft Option Card */}
                {fullQuoteData.options && fullQuoteData.options.length > 0 && (
                  <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Plane className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                          Selected Aircraft Option
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {fullQuoteData.options.map((option: any, idx: number) => (
                          <div
                            key={option.id || idx}
                            className="p-4 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  Option {idx + 1}
                                </Badge>
                                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                  {option.aircraftModel?.name || option.aircraftTail?.tailNumber || "Aircraft Option"}
                                </span>
                              </div>
                              <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                                {formatCurrency(
                                  option.price_total ||
                                    (option.cost_operator || 0) +
                                      (option.price_commission || 0) +
                                      (option.price_extras_total || 0) -
                                      (option.price_discounts_total || 0) ||
                                  0
                                )}
                              </span>
                            </div>
                            {(option.cost_operator || option.price_commission) && (
                              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                                {option.cost_operator && (
                                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                    <span>Operator Cost:</span>
                                    <span className="font-medium">{formatCurrency(option.cost_operator)}</span>
                                  </div>
                                )}
                                {option.price_commission && (
                                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                    <span>Commission:</span>
                                    <span className="font-medium">{formatCurrency(option.price_commission)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {option.flight_hours && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{option.flight_hours} flight hours</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Services Card */}
                {fullQuoteData.services && fullQuoteData.services.length > 0 && (
                  <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                          Additional Services
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {fullQuoteData.services.map((service: any, idx: number) => (
                          <div
                            key={service.id || idx}
                            className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {service.name || service.description || `Service ${idx + 1}`}
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {formatCurrency((service.amount || service.unit_price || 0) * (service.qty || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Totals Card */}
                <div className="relative overflow-hidden rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/50 shadow-lg">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100">Invoice Summary</h4>
                    </div>
                    <div className="space-y-3">
                      {fullQuoteData.options && fullQuoteData.options.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Aircraft Option:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(
                              fullQuoteData.options.reduce(
                                (sum: number, opt: any) =>
                                  sum +
                                  (opt.price_total ||
                                    (opt.cost_operator || 0) +
                                      (opt.price_commission || 0) +
                                      (opt.price_extras_total || 0) -
                                      (opt.price_discounts_total || 0) ||
                                    0),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      )}
                      {fullQuoteData.services && fullQuoteData.services.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Additional Services:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(
                              fullQuoteData.services.reduce(
                                (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 dark:border-slate-700">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Grand Total:</span>
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(
                            (fullQuoteData.options?.reduce(
                              (sum: number, opt: any) =>
                                sum +
                                (opt.price_total ||
                                  (opt.cost_operator || 0) +
                                    (opt.price_commission || 0) +
                                    (opt.price_extras_total || 0) -
                                    (opt.price_discounts_total || 0) ||
                                  0),
                              0,
                            ) || 0) +
                              (fullQuoteData.services?.reduce(
                                (sum: number, s: any) => sum + (s.amount || s.unit_price || 0) * (s.qty || 1),
                                0,
                              ) || 0),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment URL Input Card */}
                <div className="relative overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      <Label
                        htmlFor="payment-url"
                        className="font-semibold text-base text-slate-900 dark:text-slate-100"
                      >
                        Payment Link (Optional)
                      </Label>
                    </div>
                    <Input
                      id="payment-url"
                      type="url"
                      placeholder="https://payment.example.com/..."
                      value={paymentUrl}
                      onChange={(e) => setPaymentUrl(e.target.value)}
                      className="w-full h-11 text-sm"
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-slate-500" />
                      <span>Enter a payment URL that will be included in the invoice for easy customer access.</span>
                    </p>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800">
                      <FileSignature className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                        Ready to Create Invoice
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        This will generate an invoice from the quote and prepare it for sending to the customer. The
                        contract will be automatically attached.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                  <FileText className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-muted-foreground font-medium">Failed to load quote details.</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-800 pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInvoiceContractOpen(false)
                setSelectedQuote(null)
                setFullQuoteData(null)
                setPaymentUrl("")
              }}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvoiceContract}
              disabled={sending || loadingQuote}
              className="min-w-[200px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-lg hover:shadow-xl transition-all"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Invoice...
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
