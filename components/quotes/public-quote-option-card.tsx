"use client"

import { useState, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AmenityIcon } from "@/components/ui/amenity-icon"
import type { QuoteOption } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/format"
import {
  Wifi,
  Coffee,
  Tv,
  Utensils,
  Bed,
  Headphones,
  Zap,
  Shield,
  Star,
  CheckCircle,
  Users,
  Clock,
  Gauge,
  Calendar,
  Route,
} from "lucide-react"

interface PublicQuoteOptionCardProps {
  option: QuoteOption
  isSelected: boolean
  isLocked: boolean
  onSelect: () => void
  primaryColor: string
  hasSelectedOption?: boolean
}


export function PublicQuoteOptionCard({
  option,
  isSelected,
  isLocked,
  onSelect,
  primaryColor,
  hasSelectedOption = false,
}: PublicQuoteOptionCardProps) {
  const [failedImages, setFailedImages] = useState<string[]>([])
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  // Use aircraft data from the option (should be provided by the API)
  const aircraftModel = option.aircraftModel
  const aircraftTail = option.aircraftTail

  const total = option.operatorCost + option.commission + (option.tax || 0)

  const images = option.overrideImages?.length
    ? option.overrideImages
    : aircraftTail?.images?.length
      ? aircraftTail.images
      : aircraftModel?.images?.length
        ? aircraftModel.images
        : [
            `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(`${aircraftModel?.name || "Aircraft"} aircraft`)}`,
          ]

  const getImageSrc = (image: string) => {
    // If image has already failed, use placeholder
    if (failedImages.includes(image)) {
      return `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
        `${aircraftModel?.name || "Aircraft"} aircraft placeholder`,
      )}`
    }

    // If image URL looks invalid or is missing required path components, use placeholder
    if (!image || !image.includes("/aircraft/") || image.includes("undefined")) {
      return `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
        `${aircraftModel?.name || "Aircraft"} aircraft placeholder`,
      )}`
    }

    return image
  }

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on("select", onSelect)
    return () => api.off("select", onSelect)
  }, [api])

  const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api])

  const amenities = option.selectedAmenities || []
  const capacity = aircraftTail?.capacityOverride || aircraftModel?.defaultCapacity || 0

  return (
    <div className="mx-auto w-full max-w-screen-xl px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-3 sm:pb-4 md:pb-5 lg:pb-6">
      <style>{`
        .carousel-container .carousel-previous,
        .carousel-container .carousel-next,
        .carousel-container [aria-label="Previous image"],
        .carousel-container [aria-label="Next image"] { opacity:0; transition:opacity .3s ease;}
        .carousel-container:hover .carousel-previous,
        .carousel-container:hover .carousel-next,
        .carousel-container:hover [aria-label="Previous image"],
        .carousel-container:hover [aria-label="Next image"] { opacity:1; }
        @media (max-width: 1024px) {
          .carousel-container .carousel-previous,
          .carousel-container .carousel-next { opacity: 0.7; }
        }
      `}</style>

      {aircraftModel ? (
        <Card className="relative rounded-xl md:rounded-2xl bg-white shadow-sm border border-gray-100/80 hover:shadow-lg transition-all duration-500 overflow-hidden p-0">
          <div className="flex flex-col md:flex-row min-h-[450px] sm:min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
            <div className="order-1 md:order-2 relative w-full md:w-[55%] flex-shrink-0">
              <div className="carousel-container w-full h-full">
                <div className="w-full h-full bg-gray-50">
                  <Carousel className="w-full h-full" setApi={setApi}>
                    <CarouselContent className="h-full">
                      {images.map((img, i) => (
                        <CarouselItem key={i} className="basis-full h-full">
                          <div className="w-full h-full relative overflow-hidden">
                            <img
                              src={getImageSrc(img) || "/placeholder.svg"}
                              alt={`${aircraftModel?.name || "Aircraft"} - Image ${i + 1}`}
                              className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                              onError={(e) => {
                                console.warn(`Failed to load image: ${img}`, e)
                                setFailedImages((p) => (p.includes(img) ? p : [...p, img]))
                              }}
                              onLoad={() => setFailedImages((p) => p.filter((f) => f !== img))}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
                            
                            {/* Amenities Overlay */}
                            {amenities.length > 0 && (
                              <div className="absolute top-2 right-2 z-20">
                                <div className="flex flex-wrap gap-1 max-w-[100px] justify-end">
                                  {amenities.slice(0, 4).map((amenity, i) => (
                                    <Tooltip key={i}>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-white/50 hover:bg-white hover:shadow-lg transition-all duration-200">
                                          <AmenityIcon 
                                            amenity={amenity} 
                                            size={12} 
                                            className="text-gray-700"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-xs text-xs">
                                        {amenity.name}
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                  {amenities.length > 4 && (
                                    <div className="flex items-center justify-center w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-white/50">
                                      <span className="text-xs font-medium text-gray-700">+{amenities.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {images.length > 1 && (
                      <>
                        <CarouselPrevious
                          className="absolute left-2 sm:left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm border-0 shadow-md hover:bg-white hover:shadow-lg hover:scale-110 transition-all duration-300 touch-manipulation"
                          aria-label="Previous image"
                        />
                        <CarouselNext
                          className="absolute right-2 sm:right-2.5 md:right-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm border-0 shadow-md hover:bg-white hover:shadow-lg hover:scale-110 transition-all duration-300 touch-manipulation"
                          aria-label="Next image"
                        />
                        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {Array.from({ length: count }).map((_, index) => (
                            <button
                              key={index}
                              className={`h-1 rounded-full transition-all duration-300 touch-manipulation ${
                                index === current ? "w-6 bg-white shadow-sm" : "w-1 bg-white/60 hover:bg-white/80"
                              }`}
                              onClick={() => scrollTo(index)}
                              aria-label={`Go to slide ${index + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </Carousel>
                </div>
              </div>
            </div>

            <div className="order-2 md:order-1 flex flex-col w-full md:w-[45%] bg-white">
              <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 flex-1 space-y-3 sm:space-y-4 md:space-y-5">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex-1 space-y-0.5">
                      <h3 className="text-lg sm:text-xl font-light text-gray-900 tracking-tight leading-tight">
                        {aircraftModel?.name || "Aircraft Model"}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 font-light tracking-wide">
                        {aircraftModel?.manufacturer || "Aircraft Manufacturer"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 border border-gray-200/80 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      <Users className="h-3 w-3 text-gray-600" />
                      <span className="text-xs font-light text-gray-700">{capacity}</span>
                    </div>
                  </div>

                </div>


                {option.conditions?.trim() && (
                  <div>
                    <h4 className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-light mb-2.5">
                      Special Notes
                    </h4>
                    <div className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed bg-amber-50/40 border border-amber-100/80 p-3 rounded-lg">
                      {option.conditions}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100/80 bg-gray-50/20 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                {/* Aircraft Specifications */}
                <div className="mb-4">
                  <h4 className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-light mb-3 text-center">
                    Aircraft Specifications
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {aircraftTail?.year && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-gray-100/80">
                        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Year</div>
                          <div className="text-xs text-gray-900 font-semibold">{aircraftTail.year}</div>
                        </div>
                      </div>
                    )}
                    {aircraftTail?.yearOfRefurbishment && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-gray-100/80">
                        <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Refurb</div>
                          <div className="text-xs text-gray-900 font-semibold">{aircraftTail.yearOfRefurbishment}</div>
                        </div>
                      </div>
                    )}
                    {aircraftTail?.rangeNmOverride && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-gray-100/80">
                        <Route className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Range</div>
                          <div className="text-xs text-gray-900 font-semibold">{aircraftTail.rangeNmOverride} nm</div>
                        </div>
                      </div>
                    )}
                    {aircraftTail?.speedKnotsOverride && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-gray-100/80">
                        <Gauge className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Speed</div>
                          <div className="text-xs text-gray-900 font-semibold">{aircraftTail.speedKnotsOverride} kts</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 font-light">
                      Total
                    </span>
                    <div className="text-xl sm:text-2xl font-light text-gray-900 tracking-tight">
                      {formatCurrency(total)}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 border border-green-200/80 bg-green-50 text-green-700 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-[10px] sm:text-xs font-light tracking-wide">Selected</span>
                    </div>
                  )}
                </div>

                <Button
                  className={`w-full font-light tracking-wide text-xs sm:text-sm md:text-sm py-2.5 sm:py-3 md:py-3.5 rounded-lg transition-all duration-300 touch-manipulation ${
                    isSelected
                      ? "!bg-green-600 hover:!bg-green-700 !text-white border-0 shadow-sm hover:shadow-md"
                      : hasSelectedOption && !isSelected
                        ? "!bg-gray-300 hover:!bg-gray-400 !text-gray-600 !border-gray-300"
                        : "!bg-gray-900 hover:!bg-gray-800 !text-white border-0 shadow-sm hover:shadow-md"
                  }`}
                  onClick={onSelect}
                  disabled={isLocked}
                >
                  {isSelected ? "Selected" : "Select Option"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8 pb-6">
          <Card className="rounded-xl sm:rounded-2xl bg-white shadow-sm border border-gray-100/80">
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-400 font-light text-xs sm:text-sm">Aircraft model not found</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
