"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import {
  Search,
  MoreHorizontal,
  Edit,
  Archive,
  Trash2,
  Plane,
  Plus,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import { ModelCreateDialog } from "./model-create-dialog"

interface ImageCarouselProps {
  images: string[]
  alt: string
}

function ImageCarousel({ images, alt }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
      </div>
    )
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
      <img
        src={images[currentIndex] || "/placeholder.svg"}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = "none"
          target.parentElement?.querySelector(".fallback")?.classList.remove("hidden")
        }}
      />
      <div className="fallback hidden absolute inset-0 flex items-center justify-center bg-muted">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
      </div>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70"
            onClick={prevImage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70"
            onClick={nextImage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ModelsGrid() {
  const { state, dispatch, getCategoryById, getModelTails } = useMockStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)

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
      {/* Filters - same as table view */}
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

      {/* Grid View */}
      {filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModels.map((model) => {
            const category = getCategoryById(model.categoryId)
            const tails = getModelTails(model.id)

            return (
              <Card
                key={model.id}
                className={`${model.isArchived ? "opacity-60" : ""} hover:shadow-lg transition-shadow`}
              >
                <CardHeader className="p-4">
                  <ImageCarousel images={model.images || []} alt={model.name} />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div>
                      <h3 className={`font-semibold text-lg ${model.isArchived ? "line-through" : ""}`}>
                        {model.name}
                      </h3>
                      {model.manufacturer && <p className="text-sm text-muted-foreground">{model.manufacturer}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{category?.name || "Unknown"}</Badge>
                      <Badge variant={model.isArchived ? "secondary" : "default"}>
                        {model.isArchived ? "Archived" : "Active"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      {model.defaultCapacity && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span>{model.defaultCapacity}</span>
                        </div>
                      )}
                      {model.defaultRangeNm && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Range:</span>
                          <span>{model.defaultRangeNm} nm</span>
                        </div>
                      )}
                      {model.defaultSpeedKnots && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Speed:</span>
                          <span>{model.defaultSpeedKnots} knots</span>
                        </div>
                      )}
                    </div>

                    {tails.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {tails.length} tail{tails.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
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
                        <DropdownMenuItem onClick={() => handleArchiveModel(model.id)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      {model.isArchived && (
                        <DropdownMenuItem onClick={() => handleUnarchiveModel(model.id)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Unarchive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteModelId(model.id)}
                        disabled={tails.length > 0}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            )
          })}
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
