"use client"

import { useState } from "react"
import Link from "next/link"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MoreHorizontal,
  Eye,
  FileText,
  Trash2,
  ArrowUpDown,
  Search,
  Filter,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import type { Lead } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"
import { formatDate, formatTimeAgo } from "@/lib/utils/format"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface LeadTableProps {
  data: Lead[]
  showArchived?: boolean // Added prop to control archived lead visibility
}

export function LeadTable({ data, showArchived = false }: LeadTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const { dispatch, convertLeadToQuote } = useMockStore()
  const router = useRouter()
  const { toast } = useToast()

  const handleRowClick = (leadId: string) => {
    router.push(`/leads/${leadId}`)
  }

  const handleConvertToQuote = (leadId: string) => {
    try {
      const quote = convertLeadToQuote(leadId)
      toast({
        title: "Lead converted to quote",
        description: "The lead has been successfully converted to a quote.",
      })
      router.push(`/quotes/${quote.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert lead to quote.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLead = (leadId: string) => {
    dispatch({ type: "DELETE_LEAD", payload: leadId })
    toast({
      title: "Lead deleted",
      description: "The lead has been moved to deleted status.",
    })
  }

  const handleArchiveLead = (leadId: string) => {
    dispatch({ type: "ARCHIVE_LEAD", payload: leadId })
    toast({
      title: "Lead archived",
      description: "The lead has been archived and moved out of active view.",
    })
  }

  const handleUnarchiveLead = (leadId: string) => {
    dispatch({ type: "UNARCHIVE_LEAD", payload: leadId })
    toast({
      title: "Lead unarchived",
      description: "The lead has been restored to active status.",
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "new":
        return "default"
      case "converted":
        return "secondary"
      case "deleted":
        return "destructive"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "customer.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Details
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const lead = row.original
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {lead.customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className={lead.isArchived ? "opacity-60" : ""}>
              {" "}
              {/* Added visual indicator for archived leads */}
              <div className={`font-medium ${lead.isArchived ? "line-through" : ""}`}>{lead.customer.name}</div>
              <div className="text-sm text-muted-foreground">{lead.customer.company}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "legs",
      header: "Trip Details",
      cell: ({ row }) => {
        const lead = row.original
        const firstLeg = lead.legs[0]
        return (
          <div className={lead.isArchived ? "opacity-60" : ""}>
            {" "}
            {/* Added visual indicator for archived leads */}
            <div className={`font-medium ${lead.isArchived ? "line-through" : ""}`}>
              {firstLeg?.origin} → {firstLeg?.destination}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(firstLeg?.departureDate || "")}
              {lead.legs.length > 1 && ` +${lead.legs.length - 1} more legs`}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "legs.0.passengers",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Passengers
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const passengers = row.original.legs[0]?.passengers || 0
        const lead = row.original
        return <div className={`text-center ${lead.isArchived ? "opacity-60 line-through" : ""}`}>{passengers}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const lead = row.original
        return (
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(status)} className={lead.isArchived ? "opacity-60" : ""}>
              {status.replace("_", " ")}
            </Badge>
            {lead.isArchived && (
              <Badge variant="outline" className="text-xs">
                Archived
              </Badge>
            )}{" "}
            {/* Added archived badge */}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        const lead = row.original
        return (
          <div className={`text-sm ${lead.isArchived ? "opacity-60" : ""}`}>
            <div className={lead.isArchived ? "line-through" : ""}>{formatDate(date)}</div>
            <div className="text-muted-foreground">{formatTimeAgo(date)}</div>
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const lead = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/leads/${lead.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              {lead.status === "new" && !lead.isArchived && (
                <DropdownMenuItem onClick={() => handleConvertToQuote(lead.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Convert to Quote
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {!lead.isArchived ? (
                <DropdownMenuItem onClick={() => handleArchiveLead(lead.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Lead
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleUnarchiveLead(lead.id)}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive Lead
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Lead
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter details..."
            value={(table.getColumn("customer.name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("customer.name")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select
          value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
          onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => handleRowClick(row.original.id)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.id === "actions" ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
