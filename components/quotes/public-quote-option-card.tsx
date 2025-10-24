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
import type { QuoteOption } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/format"
import { Wifi, Coffee, Tv, Utensils, Bed, Headphones, Zap, Shield, Star, CheckCircle, Users, Plane, Clock, MapPin } from "lucide-react"

interface PublicQuoteOptionCardProps {
  option: QuoteOption
  isSelected: boolean
  isLocked: boolean
  onSelect: () => void
  primaryColor: string
  hasSelectedOption?: boolean
}

const getAmenityIcon = (amenity: string) => {
  const a = amenity.toLowerCase()
  if (a.includes("wifi") || a.includes("internet")) return Wifi
  if (a.includes("coffee") || a.includes("beverage")) return Coffee
  if (a.includes("tv") || a.includes("entertainment") || a.includes("screen")) return Tv
  if (a.includes("catering") || a.includes("meal") || a.includes("food")) return Utensils
  if (a.includes("bed") || a.includes("sleep") || a.includes("rest")) return Bed
  if (a.includes("headphone") || a.includes("audio")) return Headphones
  if (a.includes("power") || a.includes("charging") || a.includes("outlet")) return Zap
  if (a.includes("security") || a.includes("safe")) return Shield
  if (a.includes("premium") || a.includes("luxury") || a.includes("vip")) return Star
  return CheckCircle
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

  const total = option.operatorCost + option.commission + option.tax

  const images = option.overrideImages?.length
    ? option.overrideImages
    : aircraftTail?.images?.length
      ? aircraftTail.images
      : aircraftModel?.images?.length
        ? aircraftModel.images
        : [`/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(`${aircraftModel?.name || 'Aircraft'} aircraft`)}`]

  const getImageSrc = (image: string) => {
    // If image has already failed, use placeholder
    if (failedImages.includes(image)) {
      return `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
        `${aircraftModel?.name || 'Aircraft'} aircraft placeholder`,
      )}`
    }
    
    // If image URL looks invalid or is missing required path components, use placeholder
    if (!image || !image.includes('/aircraft/') || image.includes('undefined')) {
      return `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
        `${aircraftModel?.name || 'Aircraft'} aircraft placeholder`,
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
    <div className="mx-auto w-full max-w-screen-md sm:max-w-screen-lg lg:max-w-screen-xl px-4 sm:px-6 lg:px-8 pb-3">
      <style>{`
        .carousel-container .carousel-previous,
        .carousel-container .carousel-next,
        .carousel-container [aria-label="Previous image"],
        .carousel-container [aria-label="Next image"] { opacity:0; transition:opacity .2s ease-in-out;}
        .carousel-container:hover .carousel-previous,
        .carousel-container:hover .carousel-next,
        .carousel-container:hover [aria-label="Previous image"],
        .carousel-container:hover [aria-label="Next image"] { opacity:1; }
      `}</style>

      {aircraftModel ? (
        <Card className="relative rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden p-0 border-0">
          <div className="flex flex-col lg:flex-row">
            {/* STUNNING IMAGE CAROUSEL */}
            <div className="order-1 lg:order-2 relative w-full lg:w-[60%] overflow-hidden">
              <div className="carousel-container w-full">
                <div className="w-full aspect-[16/10] lg:aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100">
                  <Carousel className="w-full h-full" setApi={setApi}>
                    <CarouselContent className="h-full">
                      {images.map((img, i) => (
                        <CarouselItem key={i} className="basis-full h-full">
                          <div className="w-full h-full relative overflow-hidden">
                            <img
                              src={getImageSrc(img) || "/placeholder.svg"}
                              alt={`${aircraftModel?.name || 'Aircraft'} - Image ${i + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                              onError={(e) => {
                                console.warn(`Failed to load image: ${img}`, e)
                                setFailedImages((p) => (p.includes(img) ? p : [...p, img]))
                              }}
                              onLoad={() => setFailedImages((p) => p.filter((f) => f !== img))}
                            />
                            {/* Gradient overlay for better text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {images.length > 1 && (
                      <>
                        <CarouselPrevious
                          className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 text-gray-800 backdrop-blur-md border-0 shadow-xl hover:bg-white hover:scale-110 transition-all duration-200"
                          aria-label="Previous image"
                        />
                        <CarouselNext
                          className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 text-gray-800 backdrop-blur-md border-0 shadow-xl hover:bg-white hover:scale-110 transition-all duration-200"
                          aria-label="Next image"
                        />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {Array.from({ length: count }).map((_, index) => (
                            <button
                              key={index}
                              className={`h-2 w-2 rounded-full transition-all duration-200 ${
                                index === current ? "bg-white scale-125 shadow-lg" : "bg-white/60 hover:bg-white/80"
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

            {/* ENHANCED INFO SECTION */}
            <div className="order-2 lg:order-1 flex flex-col w-full lg:w-[40%] bg-white">
              <div className="p-6 lg:p-8 flex-1">
                {/* Aircraft Header */}
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">
                        {aircraftModel?.name || 'Aircraft Model'}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        {aircraftModel?.manufacturer || 'Aircraft Manufacturer'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">{capacity} passengers</span>
                    </div>
                  </div>

                  {/* Aircraft Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {aircraftTail?.tailNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Plane className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700 font-medium">Tail: {aircraftTail.tailNumber}</span>
                      </div>
                    )}
                    {aircraftTail?.year && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700 font-medium">Year: {aircraftTail.year}</span>
                      </div>
                    )}
                    {aircraftTail?.homeBase && (
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700 font-medium">Base: {aircraftTail.homeBase}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Amenities */}
                {amenities.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      Amenities & Features
                    </h4>
                    <TooltipProvider delayDuration={150}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {amenities.slice(0, 8).map((amenity, i) => {
                          const Icon = getAmenityIcon(amenity)
                          return (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Icon className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 truncate">{amenity}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-xs break-words">
                                {amenity}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                        {amenities.length > 8 && (
                          <div className="col-span-2 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span>+{amenities.length - 8} more amenities</span>
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                {/* Special Notes */}
                {option.conditions?.trim() && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Special Notes</h4>
                    <div className="text-sm text-gray-700 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      {option.conditions}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Pricing & CTA */}
              <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6 lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Cost</span>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Selected</span>
                    </div>
                  )}
                </div>
                
                <Button
                  className={`w-full font-semibold text-base py-3 transition-all duration-200 ${
                    isSelected
                      ? "!bg-green-600 hover:!bg-green-700 !text-white shadow-lg"
                      : hasSelectedOption && !isSelected
                        ? "!bg-gray-400 hover:!bg-gray-500 !text-white !border-gray-400"
                        : "!bg-blue-600 hover:!bg-blue-700 !text-white shadow-lg hover:shadow-xl"
                  }`}
                  onClick={onSelect}
                  disabled={isLocked}
                >
                  {isSelected ? "✓ Selected" : "Select This Option"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="mx-auto w-full max-w-screen-md sm:max-w-screen-lg lg:max-w-screen-xl px-4 sm:px-6 lg:px-8 pb-8">
          <Card className="rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-500">Aircraft model not found</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
