"use client"

import type React from "react"
import { useState } from "react"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react"
import { Plus, FileText, Eye, ExternalLink, Filter, Search, X, Trash2, Calendar, Users } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { formatDate, formatTimeAgo, formatCurrency } from "@/lib/utils/format"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function QuotesPage() {
  const { state, dispatch, loading, createItineraryFromQuote, getItineraryByQuoteId } = useMockStore()
  const { toast } = useToast()
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [totalFilter, setTotalFilter] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null)
  const [paymentLinkDialogOpen, setPaymentLinkDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<any>(null)
  const [paymentLink, setPaymentLink] = useState("")
  const [paymentConfirmDialogOpen, setPaymentConfirmDialogOpen] = useState(false)
  const [quoteForPaymentConfirm, setQuoteForPaymentConfirm] = useState<any>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
            <p className="text-muted-foreground">Manage and track your customer quotes</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading quotes...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending_acceptance":
        return "outline"
      case "prepare_payment":
        return "default"
      case "awaiting_payment":
        return "secondary"
      case "paid":
        return "default"
      case "accepted":
        return "default"
      case "declined":
        return "destructive"
      case "expired":
        return "secondary"
      default:
        return "outline"
    }
  }

  const calculateQuoteTotal = (quote: any) => {
    const optionsTotal = quote.options.reduce(
      (sum: number, option: any) => sum + (option.operatorCost || 0) + (option.commission || 0) + (option.tax || 0),
      0,
    )
    const servicesTotal = quote.services.reduce((sum: number, service: any) => sum + service.amount, 0)
    return optionsTotal + servicesTotal
  }

  const handleDeleteQuote = (quoteId: string) => {
    setQuoteToDelete(quoteId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteQuote = () => {
    if (quoteToDelete) {
      dispatch({
        type: "DELETE_QUOTE",
        payload: quoteToDelete,
      })
      toast({
        title: "Quote deleted",
        description: "The quote has been successfully deleted.",
      })
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
    }
  }

  const handleOpenPaymentLinkDialog = (quote: any) => {
    setSelectedQuote(quote)
    setPaymentLink("")
    setContractFile(null)
    setPaymentLinkDialogOpen(true)
  }

  const handleSendPaymentLink = () => {
    if (!paymentLink.trim()) {
      toast({
        title: "Payment link required",
        description: "Please enter a payment link before sending.",
        variant: "destructive",
      })
      return
    }

    if (selectedQuote) {
      dispatch({
        type: "UPDATE_QUOTE",
        payload: {
          id: selectedQuote.id,
          updates: { status: "awaiting_payment" },
        },
      })

      toast({
        title: "Payment link sent",
        description: `The payment link and contract have been automatically sent to the customer via email. The quote status has been updated.`,
      })

      setPaymentLinkDialogOpen(false)
      setSelectedQuote(null)
      setPaymentLink("")
      setContractFile(null)
    }
  }

  const handleToPayClick = (quote: any) => {
    setQuoteForPaymentConfirm(quote)
    setPaymentConfirmDialogOpen(true)
  }

  const handlePaymentConfirmed = () => {
    if (quoteForPaymentConfirm) {
      try {
        const itinerary = createItineraryFromQuote(quoteForPaymentConfirm.id)

        toast({
          title: "Payment confirmed & Itinerary created",
          description: "The quote has been marked as paid and an itinerary has been automatically created.",
          action: (
            <Button variant="outline" size="sm" onClick={() => router.push(`/itineraries/${itinerary.publicHash}`)}>
              <Calendar className="mr-2 h-4 w-4" />
              View Itinerary
            </Button>
          ),
        })
      } catch (error) {
        // If itinerary creation fails, still mark quote as paid but show error
        dispatch({
          type: "UPDATE_QUOTE",
          payload: {
            id: quoteForPaymentConfirm.id,
            updates: { status: "paid" },
          },
        })

        toast({
          title: "Payment confirmed",
          description:
            "The quote has been marked as paid, but there was an issue creating the itinerary. Please create it manually.",
          variant: "destructive",
        })
      }

      setPaymentConfirmDialogOpen(false)
      setQuoteForPaymentConfirm(null)
    }
  }

  const handleRowClick = (quote: any, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("button") || (event.target as HTMLElement).closest("a")) {
      return
    }

    if (quote.token) {
      router.push(`/q/${quote.token}`)
    } else {
      router.push(`/quotes/${quote.id}`)
    }
  }

  const filteredQuotes = state.quotes.filter((quote) => {
    if (statusFilter !== "all" && quote.status !== statusFilter) {
      return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = quote.customer.name.toLowerCase().includes(query)
      const matchesEmail = quote.customer.email.toLowerCase().includes(query)
      const matchesCompany = quote.customer.company.toLowerCase().includes(query)
      if (!matchesName && !matchesEmail && !matchesCompany) {
        return false
      }
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

    if (totalFilter !== "all") {
      const total = calculateQuoteTotal(quote)
      switch (totalFilter) {
        case "under_10k":
          if (total >= 10000) return false
          break
        case "10k_50k":
          if (total < 10000 || total >= 50000) return false
          break
        case "over_50k":
          if (total < 50000) return false
          break
      }
    }

    return true
  })

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending_acceptance", label: "Pending Acceptance" },
    { value: "prepare_payment", label: "Prepare Payment" },
    { value: "awaiting_payment", label: "Awaiting Payment" },
    { value: "paid", label: "Paid" },
    { value: "declined", label: "Declined" },
    { value: "expired", label: "Expired" },
  ]

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ]

  const totalOptions = [
    { value: "all", label: "All Amounts" },
    { value: "under_10k", label: "Under $10K" },
    { value: "10k_50k", label: "$10K - $50K" },
    { value: "over_50k", label: "Over $50K" },
  ]

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setDateFilter("all")
    setTotalFilter("all")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFilter !== "all" || totalFilter !== "all"

  const handleContractFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, DOC, or DOCX file.",
          variant: "destructive",
        })
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        })
        return
      }

      setContractFile(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground">Manage and track your customer quotes</p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Quote
          </Link>
        </Button>
      </div>

      {state.quotes.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Quotes</CardTitle>
                <CardDescription>Track quote status and customer responses</CardDescription>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search details by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={totalFilter} onValueChange={setTotalFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Amount" />
                  </SelectTrigger>
                  <SelectContent>
                    {totalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Details</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => {
                  const existingItinerary = getItineraryByQuoteId(quote.id)
                  return (
                    <TableRow
                      key={quote.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={(e) => handleRowClick(quote, e)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {quote.customer.name
                                .split(" ")
                                .map((n) => n[0])
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
                        <div>
                          <div className="font-medium">
                            {quote.legs[0]?.origin} → {quote.legs[0]?.destination}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(quote.legs[0]?.departureDate || "")}
                            {quote.legs.length > 1 && ` +${quote.legs.length - 1} more`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatCurrency(calculateQuoteTotal(quote))}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quote.status)}>
                          {quote.status === "prepare_payment"
                            ? "Prepare Payment"
                            : quote.status === "awaiting_payment"
                              ? "Awaiting Payment"
                              : quote.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(quote.createdAt)}</div>
                          <div className="text-muted-foreground">{formatTimeAgo(quote.createdAt)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {quote.status === "prepare_payment" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPaymentLinkDialog(quote)
                              }}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Link
                            </Button>
                          ) : quote.status === "awaiting_payment" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToPayClick(quote)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Finish
                            </Button>
                          ) : quote.status === "paid" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                let itinerary = existingItinerary
                                if (!itinerary) {
                                  try {
                                    itinerary = createItineraryFromQuote(quote.id)
                                    toast({
                                      title: "Itinerary created",
                                      description: "An itinerary has been automatically created for this paid quote.",
                                    })
                                  } catch (error) {
                                    toast({
                                      title: "Error creating itinerary",
                                      description: "There was an issue creating the itinerary. Please try again.",
                                      variant: "destructive",
                                    })
                                    return
                                  }
                                }
                                router.push(`/itineraries/${itinerary.publicHash}`)
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Itinerary
                            </Button>
                          ) : (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/quotes/${quote.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                          )}
                          {quote.token && (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/q/${quote.token}`} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteQuote(quote.id)
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filteredQuotes.length === 0 && hasActiveFilters && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
                <p className="text-muted-foreground mb-4">
                  No quotes match your current search and filter criteria. Try adjusting your filters or search terms.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first quote to get started. You can convert leads to quotes or create new ones from scratch.
            </p>
            <Button asChild>
              <Link href="/quotes/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Quote
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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

      <Dialog open={paymentLinkDialogOpen} onOpenChange={setPaymentLinkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Payment Link</DialogTitle>
            <DialogDescription>
              The payment link will be automatically sent to the customer's email. This is a demo environment, so no
              actual email will be sent.
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Quote Summary</h4>

                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedQuote.customer.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedQuote.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedQuote.customer.company}</div>
                    <div className="text-sm text-muted-foreground">{selectedQuote.customer.email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Trip Details
                  </h5>
                  {selectedQuote.legs.map((leg: any, index: number) => (
                    <div key={leg.id} className="flex items-center space-x-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                        {index + 1}
                      </div>
                      <span className="font-medium">
                        {leg.origin} → {leg.destination}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(leg.departureDate)} at {leg.departureTime}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {leg.passengers}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-lg">{formatCurrency(calculateQuoteTotal(selectedQuote))}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-link">Payment Link *</Label>
                <Input
                  id="payment-link"
                  placeholder="https://payment.example.com/quote-123"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the payment link that will be sent to the customer.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendPaymentLink}>
              <Mail className="mr-2 h-4 w-4" />
              Send Payment Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentConfirmDialogOpen} onOpenChange={setPaymentConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Confirmation</DialogTitle>
            <DialogDescription>Has the quote been paid and the contract has been sent?</DialogDescription>
          </DialogHeader>

          {quoteForPaymentConfirm && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {quoteForPaymentConfirm.customer.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{quoteForPaymentConfirm.customer.name}</div>
                  <div className="text-sm text-muted-foreground">{quoteForPaymentConfirm.customer.company}</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="font-semibold">Total Amount</span>
                <span className="font-bold">{formatCurrency(calculateQuoteTotal(quoteForPaymentConfirm))}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentConfirmDialogOpen(false)
                setQuoteForPaymentConfirm(null)
              }}
            >
              No
            </Button>
            <Button onClick={handlePaymentConfirmed}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
