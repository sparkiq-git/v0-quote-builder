"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Eye, Trash2, Search, Plus, MoreHorizontal, CheckCircle2, Send } from "lucide-react"
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
import { useAppHeader } from "@/components/app-header-context"

export default function InvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const { setContent } = useAppHeader()

  useEffect(() => {
    setContent({
      title: "Invoices",
      subtitle: "Review and manage issued invoices",
      actions: (
        <Button asChild>
          <Link href="/quotes">
            <Plus className="mr-2 h-4 w-4" />
            Create from Quote
          </Link>
        </Button>
      ),
    })

    const fetchInvoices = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID!
        const { data, error } = await supabase
          .from("invoice")
          .select(
            `id, number, issued_at, amount, currency, status, aircraft_label, summary_itinerary, quote:quote_id(contact_name, contact_company)`,
          )
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

    return () => setContent({})
  }, [setContent, toast])

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

  const handleDelete = (id: string) => {
    setInvoiceToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return
    try {
      if (typeof window === "undefined") return

      setProcessing(invoiceToDelete)
      const res = await fetch(`/api/invoice/${invoiceToDelete}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to delete invoice")

      setInvoices((prev) => prev.filter((i) => i.id !== invoiceToDelete))
      toast({ title: "Invoice deleted", description: "The invoice was removed and quote status updated to accepted." })
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete invoice.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      setProcessing(null)
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      setProcessing(id)
      const res = await fetch(`/api/invoice/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to mark invoice as paid")

      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: "paid" } : inv)))
      toast({ title: "Invoice marked as paid", description: "Invoice and quote status updated successfully." })
    } catch (err: any) {
      toast({
        title: "Failed to mark as paid",
        description: err.message || "Could not update invoice status.",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleResend = async (id: string) => {
    try {
      setProcessing(id)
      const res = await fetch(`/api/invoice/${id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          send_to_customer: true,
          send_to_tenant: true,
          include_pdf: true,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Failed to resend invoice")

      toast({ title: "Invoice resent", description: "Invoice email sent successfully to customer and tenant." })
    } catch (err: any) {
      toast({
        title: "Failed to resend invoice",
        description: err.message || "Could not resend invoice email.",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading invoices...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, name, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <SimpleSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "draft", label: "Draft" },
                { value: "issued", label: "Issued" },
                { value: "paid", label: "Paid" },
                { value: "void", label: "Void" },
              ]}
              placeholder="Status"
              triggerClassName="w-[180px]"
            />
          </div>

          {filteredInvoices.length > 0 ? (
            <div className="relative overflow-auto max-w-full max-h-[600px] rounded-lg border">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
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
                              <span className="text-muted-foreground text-xs ml-1">#{inv.number}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{inv.customer.company || "—"}</div>
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
                        <div className="text-sm font-medium">{formatCurrency(inv.amount, inv.currency)}</div>
                        <div className="text-xs text-muted-foreground">{inv.aircraft}</div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">{formatDate(inv.issuedAt)}</div>
                        <div className="text-xs text-muted-foreground">{formatTimeAgo(inv.issuedAt)}</div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={processing === inv.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${inv.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View / Edit
                                </Link>
                              </DropdownMenuItem>
                              {inv.status !== "paid" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(inv.id)}
                                  disabled={processing === inv.id}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleResend(inv.id)} disabled={processing === inv.id}>
                                <Send className="mr-2 h-4 w-4" />
                                Re-send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(inv.id)}
                                disabled={processing === inv.id}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
