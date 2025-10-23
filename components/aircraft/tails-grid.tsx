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
import { useToast } from "@/hooks/use-toast"
import { TailCreateDialog } from "./tail-create-dialog"
import { TailImageDialog } from "./tail-image-dialog"
import { computeEffectiveTail } from "@/lib/utils/aircraft"
import { useAircraft } from "@/hooks/use-aircraft"

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

export function TailsGrid() {
  const { aircraft, loading, error } = useAircraft()
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
      // TODO: Refresh data
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
      // TODO: Refresh data
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
      // TODO: Refresh data
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
      {/* Filters - same as table view */}
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
                return model ? (
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

      {/* Grid View */}
      {!loading && !error && filteredTails.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTails.map((tail) => {
            const model = tail.aircraftModel
            const effective = model ? computeEffectiveTail(model, tail) : null

            return (
              <Card
                key={tail.id}
                onClick={() => {
                  setEditTailId(tail.id)
                  setIsEditDialogOpen(true)
                }}
                className={`${tail.isArchived ? "opacity-60" : ""} hover:shadow-lg transition-shadow cursor-pointer`}
              >
                <CardHeader className="p-4">
                  <ImageCarousel images={tail.images || []} alt={tail.tailNumber} />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {tail.tailNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {model?.name || "Unknown Model"}
                        {tail.year && ` • ${tail.year}`}
                      </p>
                      {model?.manufacturer && <p className="text-xs text-muted-foreground">{model.manufacturer}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(tail.status)}>{getStatusLabel(tail.status)}</Badge>
                    </div>

                    {tail.operator && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Operator:</span> {tail.operator}
                      </div>
                    )}

                    {tail.amenities && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Amenities:</span> {tail.amenities}
                      </div>
                    )}

                    {effective && (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Capacity:</span>
                          <div className="flex items-center gap-1">
                            <span>{effective.capacity}</span>
                            {!effective.isCapOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Range:</span>
                          <div className="flex items-center gap-1">
                            <span>{effective.rangeNm} nm</span>
                            {!effective.isRangeOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Speed:</span>
                          <div className="flex items-center gap-1">
                            <span>{effective.speedKnots} knots</span>
                            {!effective.isSpeedOverridden && (
                              <Badge variant="outline" className="text-xs">
                                default
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
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
                      {!tail.isArchived && (
                        <DropdownMenuItem onClick={() => handleArchiveTail(tail.id)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      {tail.isArchived && (
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
                </CardFooter>
              </Card>
            )
          })}
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
