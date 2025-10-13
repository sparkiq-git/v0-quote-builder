"use client"

import { useState } from "react"
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
import { Search, MoreHorizontal, Edit, Archive, Trash2, Plane, Plus, ArchiveRestore } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import { ModelCreateDialog } from "./model-create-dialog"

export function ModelsTable() {
  const { state, dispatch, getCategoryById, getModelTails } = useMockStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [editModelId, setEditModelId] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Filter models
  const filteredModels = (state.aircraftModels || []).filter((model) => {
    const category = getCategoryById(model.categoryId)
    const matchesSearch =
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || model.categoryId === categoryFilter
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && !model.isArchived)
    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleArchiveModel = (modelId: string) => {
    dispatch({ type: "ARCHIVE_MODEL", payload: modelId })
    toast({
      title: "Model archived",
      description: "The aircraft model has been archived successfully.",
    })
  }

  const handleUnarchiveModel = (modelId: string) => {
    dispatch({ type: "UNARCHIVE_MODEL", payload: modelId })
    toast({
      title: "Model unarchived",
      description: "The aircraft model has been unarchived successfully.",
    })
  }

  const handleDeleteModel = (modelId: string) => {
    const tails = getModelTails(modelId)
    if (tails.length > 0) {
      toast({
        title: "Cannot delete model",
        description: "This model has associated tail numbers. Archive it instead.",
        variant: "destructive",
      })
      return
    }

    dispatch({ type: "DELETE_MODEL_IF_NO_TAILS", payload: modelId })
    setDeleteModelId(null)
    toast({
      title: "Model deleted",
      description: "The aircraft model has been deleted successfully.",
    })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(state.categories || []).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value as "active" | "all")}
        >
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Table */}
      {filteredModels.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Defaults</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map((model) => {
                const category = getCategoryById(model.categoryId)
                const tails = getModelTails(model.id)

                return (
                  <TableRow
                    key={model.id}
                    className={`${model.isArchived ? "opacity-60" : ""} hover:bg-muted/50 transition-colors cursor-pointer`}
                    onClick={() => {
                      setEditModelId(model.id)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className={`font-medium ${model.isArchived ? "line-through" : ""}`}>{model.name}</p>
                        {model.manufacturer && <p className="text-sm text-muted-foreground">{model.manufacturer}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {model.defaultCapacity && <div>Capacity: {model.defaultCapacity}</div>}
                        {model.defaultRangeNm && <div>Range: {model.defaultRangeNm} nm</div>}
                        {model.defaultSpeedKnots && <div>Speed: {model.defaultSpeedKnots} knots</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={model.isArchived ? "secondary" : "default"}>
                          {model.isArchived ? "Archived" : "Active"}
                        </Badge>
                        {tails.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {tails.length} tail{tails.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ModelCreateDialog modelId={model.id}>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </ModelCreateDialog>
                          {!model.isArchived && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveModel(model.id)
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {model.isArchived && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUnarchiveModel(model.id)
                              }}
                            >
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Unarchive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteModelId(model.id)
                            }}
                            disabled={tails.length > 0}
                            className="text-destructive"
                          >
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
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Plane className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || categoryFilter !== "all" ? "No models found" : "No aircraft models"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || categoryFilter !== "all"
              ? "Try adjusting your search terms or filters."
              : "Start by adding your first aircraft model to the catalog."}
          </p>
          {!searchTerm && categoryFilter === "all" && (
            <ModelCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Model
              </Button>
            </ModelCreateDialog>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <ModelCreateDialog
        modelId={editModelId || undefined}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Aircraft Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this aircraft model? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteModelId && handleDeleteModel(deleteModelId)}
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
