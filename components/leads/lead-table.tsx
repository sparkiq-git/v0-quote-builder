"use client"


import { useState, useEffect } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { LeadDetailModal } from "@/components/leads/lead-detail-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreHorizontal, Eye, FileText, Trash2, ArrowUpDown, Search, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Lead } from "@/lib/types"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"


interface LeadTableProps {
  data: Lead[]
  setLeads?: React.Dispatch<React.SetStateAction<Lead[]>>
  onOpenNewCountChange?: (count: number) => void  
}

export function LeadTable({ data, setLeads, onOpenNewCountChange }: LeadTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()


  useEffect(() => {
    const count =
      Array.isArray(data)
        ? data.filter(l => l && (l.status === "opened" || l.status === "new")).length
        : 0;
    onOpenNewCountChange?.(count);
  }, [data, onOpenNewCountChange]);


  const handleRowClick = async (leadId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) return

      // Optimistic UI update
      if (setLeads) {
        const now = new Date().toISOString()
        setLeads((prev) =>
          prev.map((lead) => (lead.id === leadId ? { ...lead, last_viewed_at: now } : lead))
        )
      }

      const { error: rpcError } = await supabase.rpc("rpc_log_lead_engagement", { p_lead_id: leadId })
      if (rpcError) console.error("RPC error:", rpcError)
    } catch (err) {
      console.error("Unexpected error logging engagement:", err)
    }

    setSelectedLeadId(leadId)
    setIsModalOpen(true)
  }

  const handleConvertToQuote = async (leadId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const { data: leadData, error: fetchError } = await supabase
        .from("lead")
        .select("*")
        .eq("id", leadId)
        .single()
      if (fetchError) throw fetchError

      const quote = {
        tenant_id: leadData.tenant_id,
        customer_name: leadData.customer_name,
        customer_email: leadData.customer_email,
        company: leadData.company,
        trip_summary: leadData.trip_summary,
        leg_count: leadData.leg_count,
        total_pax: leadData.total_pax,
        created_at: new Date().toISOString(),
        status: "new",
      }

      const { data: newQuote, error: insertError } = await supabase
        .from("quotes")
        .insert([quote])
        .select()
        .single()
      if (insertError) throw insertError

      await supabase.from("lead").update({ status: "converted" }).eq("id", leadId)
      toast({ title: "Lead converted", description: "Lead successfully converted to quote." })
      router.push(`/quotes/${newQuote.id}`)
    } catch (err) {
      console.error("Convert error:", err)
      toast({ title: "Error", description: "Failed to convert lead.", variant: "destructive" })
    }
  }

const handleDeleteLead = async (leadId: string, e?: React.MouseEvent) => {
  e?.stopPropagation()

  const { error } = await supabase.rpc("rpc_delete_lead", { p_lead_id: leadId })

  if (error) {
    console.error("Delete error:", error)
    toast({
      title: "Error",
      description: error.message || "Failed to delete lead.",
      variant: "destructive",
    })
    return
  }

  toast({
    title: "Lead updated",
    description: "Lead visibility handled successfully.",
  })
}


  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
      case "new":
        return "default"
      case "expired":
        return "secondary"
      case "withdrawn":
      case "deleted":
        return "destructive"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Details <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const lead = row.original
        return (
          <div className="flex flex-col">
            <span className="font-medium">{lead.customer_name || "Unknown"}</span>
            <span className="text-sm text-muted-foreground">{lead.company || "No company"}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "trip_summary",
      header: "Trip Details",
      cell: ({ row }) => {
        const lead = row.original
        return (
          <div>
            <div className="font-medium">{lead.trip_summary || "No summary"}</div>
            <div className="text-sm text-muted-foreground">
              {lead.earliest_departure ? formatDate(lead.earliest_departure) : "No date"}
              {lead.leg_count > 1 && ` +${lead.leg_count - 1} legs`}
            </div>
          </div>
        )
      },
    },
    { accessorKey: "total_pax", header: "Passengers", cell: ({ row }) => <div className="text-center">{row.original.total_pax || 0}</div> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string
        return (
          <div className="text-sm">
            <div>{formatDate(date)}</div>
            <div className="text-muted-foreground">{formatTimeAgo(date)}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "last_viewed_at",
      header: "Last Viewed",
      cell: ({ row }) => {
        const date = row.original.last_viewed_at
        return date ? (
          <div className="text-sm">
            <div>{formatDate(date)}</div>
            <div className="text-muted-foreground">{formatTimeAgo(date)}</div>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">Never</div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const lead = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(lead.id) }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {(lead.status === "active" || lead.status === "new") && (
                <DropdownMenuItem onClick={(e) => handleConvertToQuote(lead.id, e)}>
                  <FileText className="mr-2 h-4 w-4" /> Convert to Quote
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteLead(lead.id, e)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  })

  useEffect(() => {
    table.setPageSize(100)
  }, [table])

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={(table.getColumn("customer_name")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("customer_name")?.setFilterValue(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row.original.id)}
                  className="cursor-pointer hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <LeadDetailModal leadId={selectedLeadId} open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </div>
  )
}
