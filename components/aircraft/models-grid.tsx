"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
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
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useAircraftModels } from "@/hooks/use-aircraft-models"
import { updateModel, deleteModel } from "@/lib/supabase/queries/models"
import { ModelEditDialog } from "./model-edit-dialog"

/* ---------- Image Carousel ---------- */
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  if (!images?.length)
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <ImageIcon className="h-12 w-12 text-muted-foreground" />
      </div>
    )

  const next = () => setCurrentIndex((i) => (i + 1) % images.length)
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length)

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden group">
      <img 
        src={images[currentIndex]} 
        alt={alt} 
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
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/40 text-white hover:bg-black/60"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}

/* ---------- ModelsGrid ---------- */
export function ModelsGrid() {
  const { models, loading, error } = useAircraftModels()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const filtered = (models || []).filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (!m.isArchived && statusFilter === "active")
    return matchesSearch && matchesStatus
  })

  const handleArchive = async (id: string, archived: boolean) => {
    try {
      await updateModel(id, { isArchived: archived })
      toast({ title: `Model ${archived ? "archived" : "unarchived"}` })
      onRefresh?.()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteModel(id)
      toast({ title: "Model deleted" })
      setDeleteId(null)
      // Refresh will happen automatically via the hook
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold mb-2">Error loading models</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
      </div>
    )
  }

  return (
    <>
      {editId && (
        <ModelEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          modelId={editId}
          onUpdated={onRefresh}
        />
      )}

      <div className="space-y-4">
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
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v as "active" | "all")}
          >
            <ToggleGroupItem value="active">Active</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((m) => (
              <Card
                key={m.id}
                className={`${m.isArchived ? "opacity-60" : ""} hover:shadow-lg transition-shadow cursor-pointer`}
                onClick={() => {
                  setEditId(m.id)
                  setEditOpen(true)
                }}
              >
                <CardHeader className="p-4">
                  <ImageCarousel images={m.images || []} alt={m.name} />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <h3 className={`font-semibold text-lg ${m.isArchived ? "line-through" : ""}`}>
                    {m.name}
                  </h3>
                  {m.manufacturer && (
                    <p className="text-sm text-muted-foreground">{m.manufacturer.name}</p>
                  )}
                  <Badge variant={m.isArchived ? "secondary" : "default"}>
                    {m.isArchived ? "Archived" : "Active"}
                  </Badge>
                  <div className="text-sm space-y-1">
                    {m.defaultCapacity && <div>Capacity: {m.defaultCapacity}</div>}
                    {m.defaultRangeNm && <div>Range: {m.defaultRangeNm} nm</div>}
                    {m.defaultSpeedKnots && <div>Speed: {m.defaultSpeedKnots} kt</div>}
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
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditId(m.id)
                          setEditOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      {!m.isArchived ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchive(m.id, true)
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchive(m.id, false)
                          }}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(m.id)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No models found.</p>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Aircraft Model</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
