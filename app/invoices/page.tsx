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
import { Eye, Trash2, Search, Plus } from "lucide-react"
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
            quote:quote_id(contact_name, contact_company)
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

  // 🔍 Filter logic
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matches =
        inv.number?.toLowerCase().includes(q) ||
        inv.customer.name.toLowerCase().includes(q) ||
        inv.customer.company.toLowerCase().includes(q)
      return matches
    }
    return true
  })

  // 🗑️ Delete handling
  const handleDelete = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      const { error } = await supabase.from("invoice").delete().eq("id", invoiceToDelete)
      if (error) throw error
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete))
      toast({ title: "Invoice deleted", description: "The invoice was removed successfully." })
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

  // 🕒 Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading invoices...</p>
      </div>
    )
  }

  // 🧾 UI Layout
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Review and manage issued invoices</p>
        </div>
        <Button asChild>
          <Link href="/quotes">
            <Plus className="mr-2 h-4 w-4" />
            Create from Quote
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Track payment status and issued documents</CardDescription>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, name, or company..."
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
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {inv.customer.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {inv.customer.name}{" "}
                            <span className="text-muted-foreground text-xs ml-1">
                              #{inv.number}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {inv.customer.company || "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "default"
                            : inv.status === "issued"
                            ? "secondary"
                            : inv.status === "void"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm font-medium">
                        {formatCurrency(inv.amount, inv.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">{inv.aircraft}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">{formatDate(inv.issuedAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(inv.issuedAt)}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${inv.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(inv.id)}
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
            <div className="py-8 text-center text-muted-foreground">
              No invoices found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
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
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
