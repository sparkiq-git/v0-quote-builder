"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { SimpleDropdownComposable, SimpleDropdownItem } from "@/components/ui/simple-dropdown"
import { Search, MoreHorizontal, Edit, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useAircraftModels } from "@/hooks/use-aircraft-models"
// Removed deleteModel import since users can't delete public models
import { ModelImageDialog } from "./model-image-dialog"

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
        src={images[currentIndex] || "/placeholder.svg"}
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
  // Removed statusFilter since all models are public
  // Removed delete functionality since users can't delete public models
  const [imageModelId, setImageModelId] = useState<string | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

  const filtered = (models || []).filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Archive and delete functionality removed for public catalog

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
      {imageModelId && (
        <ModelImageDialog open={imageDialogOpen} onOpenChange={setImageDialogOpen} modelId={imageModelId} />
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
          {/* Removed filter toggle since all models are public */}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((m) => (
              <Card
                key={m.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setImageModelId(m.id)
                  setImageDialogOpen(true)
                }}
              >
                <CardHeader className="p-4">
                  <ImageCarousel images={m.images || []} alt={m.name} />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <h3 className="font-semibold text-lg">{m.name}</h3>
                  {m.manufacturer && <p className="text-sm text-muted-foreground">{m.manufacturer}</p>}
                  <div className="text-sm space-y-1">
                    {m.capacityPax && <div>Capacity: {m.capacityPax} pax</div>}
                    {m.rangeNm && <div>Range: {m.rangeNm} nm</div>}
                    {m.cruisingSpeed && <div>Speed: {m.cruisingSpeed} kt</div>}
                    {m.mtowKg && <div>MTOW: {m.mtowKg} kg</div>}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <SimpleDropdownComposable
                    trigger={
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
                      </Button>
                    }
                    align="end"
                  >
                    <SimpleDropdownItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageModelId(m.id)
                        setImageDialogOpen(true)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Add Images
                    </SimpleDropdownItem>
                  </SimpleDropdownComposable>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">No models found.</p>
            <p className="text-sm text-muted-foreground">No aircraft models match your search criteria.</p>
          </div>
        )}

        {/* Delete dialog removed since users can't delete public models */}
      </div>
    </>
  )
}
