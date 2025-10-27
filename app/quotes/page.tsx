"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Plus,
  FileText,
  Eye,
  ExternalLink,
  Filter,
  Search,
  X,
  Trash2,
  Calendar,
  CheckCircle,
  FileCheck,
  Loader2,
  Send,
  FileSignature
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
import { QuoteWorkflowStepper } from "@/components/quotes/quote-workflow-stepper"
import { deleteQuote } from "@/lib/supabase/queries/quotes"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [totalFilter, setTotalFilter] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)
  const [invoiceContractOpen, setInvoiceContractOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null)
  const [sending, setSending] = useState(false)

  // ✅ Fetch quotes from Supabase
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        const { data, error } = await supabase
          .from("quote")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })

        if (error) throw error

        const mapped = data.map((q) => ({
          id: q.id,
          status: q.status,
          createdAt: q.created_at,
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

  const handleDeleteQuote = (quoteId: string) => {
    setQuoteToDelete(quoteId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteQuote = async () => {
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
  }

  const [converting, setConverting] = useState<string | null>(null)

  const handleConvertToInvoice = async (quoteId: string) => {
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
  }

  // Invoice & Contract handler
  const handleOpenInvoiceContractModal = async (quote: any) => {
    setSelectedQuote(quote)
    setInvoiceContractOpen(true)
  }

  const handleSendInvoiceContract = async () => {
    if (!selectedQuote) return

    try {
      setSending(true)
      
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession()
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
      setQuotes((prev) =>
        prev.map((q) => (q.id === selectedQuote.id ? { ...q, status: "invoiced" } : q))
      )

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
  }

  // Check if quote can send invoice & contract
  const canSendInvoiceContract = (quote: any) => {
    return quote.status === "accepted"
  }

  const filteredQuotes = quotes.filter((quote) => {
    if (statusFilter !== "all" && quote.status !== statusFilter) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = quote.customer.name.toLowerCase().includes(query)
      const matchesEmail = quote.customer.email.toLowerCase().includes(query)
      const matchesCompany = quote.customer.company?.toLowerCase().includes(query)
      if (!matchesName && !matchesEmail && !matchesCompany) return false
    }

    if (dateFilter !== "all") {
      const quoteDate = new Date(quote.createdAt)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - quoteDate.getTime()) / (1000 * 60 * 60 * 24))
      switch (dateFilter) {
        case "today":
          if (daysDiff > 0) return false
          break
        case "week":
          if (daysDiff > 7) return false
          break
        case "month":
          if (daysDiff > 30) return false
          break
      }
    }

    return true
  })

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
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Quotes</CardTitle>
              <CardDescription>Track quote status and customer responses</CardDescription>
            </div>
            <Button asChild>
              <Link href="/quotes/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Quote
              </Link>
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {quote.customer.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{quote.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{quote.customer.company}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative inline-block">
                        <Badge variant="outline">{quote.status}</Badge>
                        {quote.status === "opened" && quote.openCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {quote.openCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(quote.createdAt)}</div>
                        <div className="text-muted-foreground">{formatTimeAgo(quote.createdAt)}</div>
                      </div>
                    </TableCell>
<TableCell>
  <div className="flex items-center space-x-2">
    <Button
      variant="default"
      size="sm"
      disabled={!canSendInvoiceContract(quote)}
      onClick={() => handleOpenInvoiceContractModal(quote)}
      title={!canSendInvoiceContract(quote) ? "Quote must be accepted to send invoice & contract" : ""}
    >
      <FileSignature className="mr-2 h-4 w-4" />
      Invoice & Contract
    </Button>

    <Button asChild variant="outline" size="sm">
      <Link href={`/quotes/${quote.id}`}>
        <Eye className="mr-2 h-4 w-4" />
        Edit
      </Link>
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => handleConvertToInvoice(quote.id)}
      disabled={converting === quote.id}
    >
      {converting === quote.id ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Invoice
        </>
      )}
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => handleDeleteQuote(quote.id)}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No quotes found.</div>
          )}
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
