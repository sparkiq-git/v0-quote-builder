"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Search, Trash2, FileSignature, ArrowUpDown, Filter, MoreHorizontal } from "lucide-react"
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
import { deleteQuote, getQuoteById } from "@/lib/supabase/queries/quotes"
import { InvoiceContractWizard } from "@/components/quotes/invoice-contract-wizard"
import { SimpleDropdown } from "@/components/ui/simple-dropdown"
import { useAppHeader } from "@/components/app-header-context"

export default function QuotesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { setContent } = useAppHeader()
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

  useEffect(() => {
    setContent({
      title: "Quotes",
      subtitle: "Track quote status and customer responses",
      actions: (
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Quote
          </Link>
        </Button>
      ),
    })

    return () => {
      setContent({})
    }
  }, [setContent])

  // Fetch quotes from Supabase (client-side only)
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

  const handleInvoiceContractSuccess = useCallback(() => {
    // Update quote status in UI
    if (selectedQuote) {
      setQuotes((prev) => prev.map((q) => (q.id === selectedQuote.id ? { ...q, status: "invoiced" } : q)))
    }
    // Reset state
    setSelectedQuote(null)
    setFullQuoteData(null)
    setInvoiceContractOpen(false)
  }, [selectedQuote])

  // Check if quote can send invoice & contract
  const canSendInvoiceContract = useCallback((quote: any) => {
    return quote.status === "accepted"
  }, [])

  // Enhanced filtering with better search experience
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
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search quotes by title, name, company, email, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
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

          <div className="relative overflow-auto max-w-full max-h-[600px] rounded-lg border border-[#e5e7eb]">
            <Table className="min-w-[800px]">
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
                        <SimpleDropdown
                          trigger={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                          items={[
                            {
                              label: "View/Edit",
                              icon: <Eye className="h-4 w-4" />,
                              onClick: () => router.push(`/quotes/${quote.id}`),
                            },
                            ...(canSendInvoiceContract(quote)
                              ? [
                                  {
                                    label: "Invoice & Contract",
                                    icon: <FileSignature className="h-4 w-4" />,
                                    onClick: () => handleOpenInvoiceContractModal(quote),
                                    separator: true,
                                  },
                                ]
                              : []),
                            {
                              label: "Delete Quote",
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => handleDeleteQuote(quote.id),
                              variant: "destructive" as const,
                              separator: true,
                            },
                          ]}
                          align="end"
                        />
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

      <InvoiceContractWizard
        open={invoiceContractOpen}
        onOpenChange={setInvoiceContractOpen}
        selectedQuote={selectedQuote}
        fullQuoteData={fullQuoteData}
        loadingQuote={loadingQuote}
        onSuccess={handleInvoiceContractSuccess}
      />
    </div>
  )
}
