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
import { Search, Eye, Trash2, Plus, FileText } from "lucide-react"
import { formatCurrency, formatDate, formatTimeAgo } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)

  // ✅ Fetch invoices from Supabase
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        const { data, error } = await supabase
          .from("invoice")
          .select(`
            id,
            number,
            issued_at,
            amount,
            currency,
            status,
            aircraft_label,
            summary_itinerary,
            quote:quote_id(contact_name, contact_company, contact_email)
          `)
          .eq("tenant_id", tenantId)
          .order("issued_at", { ascending: false })

        if (error) throw error

        const mapped = data.map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          issuedAt: inv.issued_at,
          amount: inv.amount,
          currency: inv.currency,
          aircraft: inv.aircraft_label,
          itinerary: inv.summary_itinerary,
          customer: {
            name: inv.quote?.contact_name || "—",
            company: inv.quote?.contact_company || "",
            email: inv.quote?.contact_email || "",
          },
        }))
        setInvoices(mapped)
      } catch (err: any) {
        console.error("❌ Error loading invoices:", err)
        toast({
          title: "Failed to load invoices",
          description: err.message || "Could not fetch invoices from Supabase.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [toast])

  /* ---------------------- Filtering ---------------------- */
  const filteredInvoices = invoices.filter((invoice) => {
    if (statusFilter !== "all" && invoice.status !== statusFilter) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = invoice.customer.name.toLowerCase().includes(query)
      const matchesEmail = invoice.customer.email.toLowerCase().includes(query)
      const matchesCompany = invoice.customer.company?.toLowerCase().includes(query)
      const matchesNumber = invoice.number?.toLowerCase().includes(query)
      if (!matchesName && !matchesEmail && !matchesCompany && !matchesNumber) return false
    }

    return true
  })

  /* ---------------------- Delete Invoice ---------------------- */
  const handleDeleteInvoice = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return
    try {
      const { error } = await supabase.from("invoice").delete().eq("id", invoiceToDelete)
      if (error) throw error
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete))
      toast({ title: "Invoice deleted", description: "The invoice has been removed successfully." })
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete invoice.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  /* ---------------------- Loading / Empty ---------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading invoices...</p>
      </div>
    )
  }

  /* ---------------------- Render ---------------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm">
            Manage and track issued invoices for your quotes.
          </p>
        </div>
        <Button asChild>
          <Link href="/quotes">
            <FileText className="mr-2 h-4 w-4" />
            Back to Quotes
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>View and manage billing documents</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/quotes">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            </Button>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, name, email, or company..."
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
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {invoice.customer.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {invoice.customer.name}{" "}
                            <span className="text-muted-foreground text-xs ml-1">
                              #{invoice.number}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.customer.company || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "issued"
                            ? "secondary"
                            : invoice.status === "void"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">{invoice.aircraft}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {formatDate(invoice.issuedAt)}
                        <div className="text-muted-foreground text-xs">
                          {formatTimeAgo(invoice.issuedAt)}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.id)}
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
            <div className="py-8 text-center text-muted-foreground">No invoices found.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteInvoice}>
              Delete Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
