"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, MoreHorizontal, Edit, Archive, Trash2, Plane, Plus, ArchiveRestore, ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TailCreateDialog } from "./tail-create-dialog"
import { TailImageDialog } from "./tail-image-dialog"
import { computeEffectiveTail } from "@/lib/utils/aircraft"
import { useAircraft } from "@/hooks/use-aircraft"

export function TailsTable() {
  const { aircraft, loading, error, refetch } = useAircraft()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [modelFilter, setModelFilter] = useState("all")
  const [archiveFilter, setArchiveFilter] = useState<"active" | "all">("active")
  const [deleteTailId, setDeleteTailId] = useState<string | null>(null)
  const [editTailId, setEditTailId] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [imageTailId, setImageTailId] = useState<string | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

  // Listen for aircraft data updates
  useEffect(() => {
    const handleDataUpdate = () => {
      refetch()
    }
    window.addEventListener('aircraft-data-updated', handleDataUpdate)
    return () => {
      window.removeEventListener('aircraft-data-updated', handleDataUpdate)
    }
  }, [refetch])

  const filteredTails = aircraft.filter((tail) => {
    const model = tail.aircraftModel
    const matchesSearch =
      tail.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tail.amenities?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tail.operator?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tail.status === statusFilter
    const matchesModel = modelFilter === "all" || tail.modelId === modelFilter
    // Note: We don't have isArchived field in the database yet, so we'll show all for now
    const matchesArchive = archiveFilter === "all" || (archiveFilter === "active" && true)
    return matchesSearch && matchesStatus && matchesModel && matchesArchive
  })

  const uniqueStatuses = Array.from(new Set(aircraft.map((tail) => tail.status)))

  const handleArchiveTail = async (tailId: string) => {
    try {
      const response = await fetch(`/api/aircraft/${tailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })
      
      if (!response.ok) throw new Error("Failed to archive tail")
      
      toast({
        title: "Tail archived",
        description: "The aircraft tail has been archived successfully.",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive tail. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUnarchiveTail = async (tailId: string) => {
    try {
      const response = await fetch(`/api/aircraft/${tailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      
      if (!response.ok) throw new Error("Failed to unarchive tail")
      
      toast({
        title: "Tail unarchived",
        description: "The aircraft tail has been unarchived successfully.",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive tail. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTail = async (tailId: string) => {
    try {
      const response = await fetch(`/api/aircraft/${tailId}`, {
        method: "DELETE",
      })
      
      if (!response.ok) throw new Error("Failed to delete tail")
      
      setDeleteTailId(null)
      toast({
        title: "Tail deleted",
        description: "The aircraft tail has been deleted successfully.",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tail. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active"
      case "inactive":
        return "Inactive"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {Array.from(new Set(aircraft.map(tail => tail.aircraftModel?.id).filter(Boolean)))
              .map((modelId) => {
                const model = aircraft.find(tail => tail.aircraftModel?.id === modelId)?.aircraftModel
                return model && modelId ? (
                  <SelectItem key={modelId} value={modelId}>
                    {model.name}
                  </SelectItem>
                ) : null
              })}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={archiveFilter}
          onValueChange={(value) => value && setArchiveFilter(value as "active" | "all")}
        >
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Plane className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading aircraft</h3>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredTails.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead>Effective Values</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTails.map((tail) => {
                const model = tail.aircraftModel
                const effective = model ? computeEffectiveTail(model, tail) : null

                return (
                  <TableRow
                    key={tail.id}
                    onClick={() => {
                      setEditTailId(tail.id)
                      setIsEditDialogOpen(true)
                    }}
                    className={`${tail.status === "inactive" ? "opacity-60" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{tail.tailNumber}</p>
                        {tail.year && <p className="text-sm text-muted-foreground">{tail.year}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{model?.name || "Unknown"}</p>
                        {model?.manufacturer && <p className="text-sm text-muted-foreground">{model.manufacturer}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{tail.operator || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{tail.amenities || "—"}</span>
                    </TableCell>
                    <TableCell>
                      {effective && (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span>Capacity: {effective.capacity}</span>
                            {!effective.isCapOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Range: {effective.rangeNm} nm</span>
                            {!effective.isRangeOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Speed: {effective.speedKnots} knots</span>
                            {!effective.isSpeedOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tail.status)}>{getStatusLabel(tail.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <TailCreateDialog tailId={tail.id}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </TailCreateDialog>
                          <DropdownMenuItem onClick={() => {
                            setImageTailId(tail.id)
                            setImageDialogOpen(true)
                          }}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Add Images
                          </DropdownMenuItem>
                          {tail.status !== "inactive" && (
                            <DropdownMenuItem onClick={() => handleArchiveTail(tail.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {tail.status === "inactive" && (
                            <DropdownMenuItem onClick={() => handleUnarchiveTail(tail.id)}>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Unarchive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteTailId(tail.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : !loading && !error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Plane className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || statusFilter !== "all" || modelFilter !== "all" ? "No tails found" : "No aircraft tails"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || statusFilter !== "all" || modelFilter !== "all"
              ? "Try adjusting your search terms or filters."
              : "Start by adding your first aircraft tail to the catalog."}
          </p>
          {!searchTerm && statusFilter === "all" && modelFilter === "all" && (
            <TailCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tail
              </Button>
            </TailCreateDialog>
          )}
        </div>
      ) : null}

      {/* Edit Dialog */}
      <TailCreateDialog tailId={editTailId || undefined} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />

      {/* Image Dialog */}
      <TailImageDialog tailId={imageTailId} open={imageDialogOpen} onOpenChange={setImageDialogOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTailId} onOpenChange={() => setDeleteTailId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Aircraft Tail</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this aircraft tail? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTailId && handleDeleteTail(deleteTailId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
