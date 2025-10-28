"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, FileText, Eye, Search, Trash2, Loader2, Send, FileSignature, ArrowUpDown, Filter, MoreHorizontal } from "lucide-react"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteQuote } from "@/lib/supabase/queries/quotes"
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
  const [sending, setSending] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)

  // ✅ Fetch quotes from Supabase
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
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

  const handleConvertToInvoice = useCallback(async (quoteId: string) => {
    try {
      setConverting(quoteId)
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create invoice")

      toast({
        title: "Invoice created",
        description: `Invoice ${data.data.invoice.number} created successfully.`,
      })
    } catch (err: any) {
      console.error("❌ Invoice creation failed:", err)
      toast({
        title: "Failed to create invoice",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setConverting(null)
    }
  }, [toast])

  // Invoice & Contract handler
  const handleOpenInvoiceContractModal = useCallback(async (quote: any) => {
    setSelectedQuote(quote)
    setInvoiceContractOpen(true)
  }, [])

  const handleSendInvoiceContract = useCallback(async () => {
    if (!selectedQuote) return

    try {
      setSending(true)

      // Check authentication
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke("send-contract", {
        body: { quote_id: selectedQuote.id },
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error || "Failed to send")

      // Show success message
      toast({
        title: "Invoice & Contract sent",
        description: `Invoice ${data.invoice?.number} and contract sent successfully.`,
      })

      // Update quote status in UI
      setQuotes((prev) => prev.map((q) => (q.id === selectedQuote.id ? { ...q, status: "invoiced" } : q)))

      // Close modal and reset
      setInvoiceContractOpen(false)
      setSelectedQuote(null)
    } catch (err: any) {
      console.error("Failed to send invoice & contract:", err)
      toast({
        title: "Failed to send",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [selectedQuote, toast])

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
          quote.title?.toLowerCase() || '',
          quote.customer.name?.toLowerCase() || '',
          quote.customer.email?.toLowerCase() || '',
          quote.customer.company?.toLowerCase() || '',
          quote.status?.toLowerCase() || ''
        ]
        
        if (!searchableFields.some(field => field.includes(query))) return false
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
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
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

      <div className="flex items-center py-4 gap-4">
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
                        <div className="absolute -top-3 -right-1 bg-slate-50 border border-slate-70 rounded-full flex items-center justify-center font-normal w-3.2 h-3.2">
                          <span className="text-[0.7125rem] font-small text-slate-700">{quote.openCount}</span>
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
                        <DropdownMenuItem onClick={(e) => handleConvertToInvoice(quote.id)} disabled={converting === quote.id}>
                          {converting === quote.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <FileText className="mr-2 h-4 w-4" />
                              Create Invoice
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={(e) => handleDeleteQuote(quote.id)}
                        >
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Invoice & Contract</DialogTitle>
            <DialogDescription>
              Review the quote details and send invoice and contract to the customer.
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Customer</h4>
                <p className="text-sm">{selectedQuote.customer.name}</p>
                <p className="text-sm text-muted-foreground">{selectedQuote.customer.email}</p>
                <p className="text-sm text-muted-foreground">{selectedQuote.customer.company}</p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold mb-2">Quote Details</h4>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Status:</span> {selectedQuote.status}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Created:</span> {formatDate(selectedQuote.createdAt)}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium">Expires:</span> {formatDate(selectedQuote.expiresAt)}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> The customer will receive an email with:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-900 mt-2 space-y-1">
                  <li>Invoice for the accepted quote</li>
                  <li>DocuSign contract to sign electronically</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceContractOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvoiceContract} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invoice & Contract
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
