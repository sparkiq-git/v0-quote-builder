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
import { useDeviceDetection, deviceLayouts } from "@/hooks/use-device-detection"
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

interface AdaptiveQuoteCardProps {
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

export function AdaptiveQuoteCard({
  option,
  isSelected,
  isLocked,
  onSelect,
  primaryColor,
  hasSelectedOption = false,
}: AdaptiveQuoteCardProps) {
  const [failedImages, setFailedImages] = useState<string[]>([])
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  const deviceInfo = useDeviceDetection()
  const layout = deviceLayouts[deviceInfo.type]

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
        : [
            `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(`${aircraftModel?.name || "Aircraft"} aircraft`)}`,
          ]

  const getImageSrc = (image: string) => {
    if (failedImages.includes(image)) {
      return `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
        `${aircraftModel?.name || "Aircraft"} aircraft placeholder`,
      )}`
    }

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

  // Device-specific styling
  const getCardClasses = () => {
    const baseClasses =
      "relative bg-white shadow-sm border border-gray-100/80 hover:shadow-lg transition-all duration-500 overflow-hidden p-0"

    switch (deviceInfo.type) {
      case "mobile":
        return `${baseClasses} rounded-xl min-h-[400px]`
      case "tablet":
        return `${baseClasses} rounded-xl md:rounded-2xl min-h-[500px]`
      case "desktop":
        return `${baseClasses} rounded-2xl min-h-[600px]`
      case "large-desktop":
        return `${baseClasses} rounded-3xl min-h-[700px]`
      default:
        return baseClasses
    }
  }

  const getImageClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return "w-full h-48 sm:h-56"
      case "tablet":
        return "w-full h-56 md:h-64"
      case "desktop":
        return "w-full h-64 lg:h-72"
      case "large-desktop":
        return "w-full h-72 xl:h-80"
      default:
        return "w-full h-64"
    }
  }

  const getContentClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return "p-3 sm:p-4 flex-1 space-y-3"
      case "tablet":
        return "p-4 sm:p-5 md:p-6 flex-1 space-y-4"
      case "desktop":
        return "p-5 sm:p-6 lg:p-8 flex-1 space-y-5"
      case "large-desktop":
        return "p-6 sm:p-8 xl:p-10 flex-1 space-y-6"
      default:
        return "p-4 flex-1 space-y-4"
    }
  }

  const getButtonClasses = () => {
    const baseClasses = "w-full font-light tracking-wide rounded-lg transition-all duration-300 touch-manipulation"

    switch (deviceInfo.type) {
      case "mobile":
        return `${baseClasses} text-xs py-2.5`
      case "tablet":
        return `${baseClasses} text-sm py-3`
      case "desktop":
        return `${baseClasses} text-sm py-3.5`
      case "large-desktop":
        return `${baseClasses} text-base py-4`
      default:
        return `${baseClasses} text-sm py-3`
    }
  }

  const getGridClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return "grid grid-cols-1 gap-1.5"
      case "tablet":
        return "grid grid-cols-2 gap-2"
      case "desktop":
        return "grid grid-cols-2 gap-3"
      case "large-desktop":
        return "grid grid-cols-2 gap-4"
      default:
        return "grid grid-cols-2 gap-2"
    }
  }

  if (!aircraftModel) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-3 sm:pb-4 md:pb-5 lg:pb-6">
        <Card className="rounded-xl sm:rounded-2xl bg-white shadow-sm border border-gray-100/80">
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400 font-light text-xs sm:text-sm">Aircraft model not found</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-3 sm:pb-4 md:pb-5 lg:pb-6">
      <style>{`
        .carousel-container .carousel-previous,
        .carousel-container .carousel-next,
        .carousel-container [aria-label="Previous image"],
        .carousel-container [aria-label="Next image"] { 
          opacity: 0; 
          transition: opacity 0.3s ease;
        }
        .carousel-container:hover .carousel-previous,
        .carousel-container:hover .carousel-next,
        .carousel-container:hover [aria-label="Previous image"],
        .carousel-container:hover [aria-label="Next image"] { 
          opacity: 1; 
        }
        @media (max-width: 1024px) {
          .carousel-container .carousel-previous,
          .carousel-container .carousel-next { 
            opacity: 0.7; 
          }
        }
      `}</style>

      <div
        className={`grid gap-4 ${layout.cardLayout === "stacked" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1.2fr_1fr]"}`}
      >
        {/* LEFT CARD - Image with Overlay */}
        <Card className={`relative overflow-hidden group ${getCardClasses()}`}>
          <div className="carousel-container w-full h-full min-h-[500px] lg:min-h-[600px]">
            <Carousel className="w-full h-full" setApi={setApi}>
              <CarouselContent className="h-full">
                {images.map((img, i) => (
                  <CarouselItem key={i} className="basis-full h-full">
                    <div className="w-full h-full relative overflow-hidden">
                      <img
                        src={getImageSrc(img) || "/placeholder.svg"}
                        alt={`${aircraftModel?.name || "Aircraft"} - Image ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        onError={(e) => {
                          console.warn(`Failed to load image: ${img}`, e)
                          setFailedImages((p) => (p.includes(img) ? p : [...p, img]))
                        }}
                        onLoad={() => setFailedImages((p) => p.filter((f) => f !== img))}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {images.length > 1 && (
                <>
                  <CarouselPrevious
                    className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-gray-800 backdrop-blur-sm border-0 shadow-lg hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                      deviceInfo.type === "mobile"
                        ? "h-9 w-9"
                        : deviceInfo.type === "tablet"
                          ? "h-10 w-10"
                          : deviceInfo.type === "desktop"
                            ? "h-11 w-11"
                            : "h-12 w-12"
                    }`}
                    aria-label="Previous image"
                  />
                  <CarouselNext
                    className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-gray-800 backdrop-blur-sm border-0 shadow-lg hover:bg-white hover:shadow-xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                      deviceInfo.type === "mobile"
                        ? "h-9 w-9"
                        : deviceInfo.type === "tablet"
                          ? "h-10 w-10"
                          : deviceInfo.type === "desktop"
                            ? "h-11 w-11"
                            : "h-12 w-12"
                    }`}
                    aria-label="Next image"
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {Array.from({ length: count }).map((_, index) => (
                      <button
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 touch-manipulation ${
                          index === current ? "w-8 bg-white shadow-md" : "w-1.5 bg-white/70 hover:bg-white/90"
                        }`}
                        onClick={() => scrollTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </Carousel>

            <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 z-10">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3
                    className={`font-light text-white tracking-tight leading-tight drop-shadow-lg ${
                      deviceInfo.type === "mobile"
                        ? "text-2xl sm:text-3xl"
                        : deviceInfo.type === "tablet"
                          ? "text-3xl sm:text-4xl"
                          : deviceInfo.type === "desktop"
                            ? "text-4xl"
                            : "text-5xl"
                    }`}
                  >
                    {aircraftModel?.name || "Aircraft Model"}
                  </h3>
                  <p
                    className={`text-white/90 font-light tracking-wide drop-shadow-md ${
                      deviceInfo.type === "mobile"
                        ? "text-sm sm:text-base"
                        : deviceInfo.type === "tablet"
                          ? "text-base sm:text-lg"
                          : deviceInfo.type === "desktop"
                            ? "text-lg"
                            : "text-xl"
                    }`}
                  >
                    {aircraftModel?.manufacturer || "Aircraft Manufacturer"}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
                      <Users className="h-3.5 w-3.5 text-white" />
                      <span className="text-sm font-light text-white">{capacity} passengers</span>
                    </div>
                    {aircraftTail?.year && (
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
                        <Calendar className="h-3.5 w-3.5 text-white" />
                        <span className="text-sm font-light text-white">{aircraftTail.year}</span>
                      </div>
                    )}
                    {aircraftTail?.speedKnotsOverride && (
                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
                        <Gauge className="h-3.5 w-3.5 text-white" />
                        <span className="text-sm font-light text-white">{aircraftTail.speedKnotsOverride} kts</span>
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center gap-2 bg-green-500/95 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium text-sm tracking-wide">Selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* RIGHT CARD - Details and CTA */}
        <Card className={`${getCardClasses()} flex flex-col`}>
          <div className="flex-1 p-6 lg:p-8 space-y-6">
            <div className="space-y-1">
              <span className="uppercase tracking-wider text-gray-500 font-light text-xs">Total Price</span>
              <div
                className={`font-light text-gray-900 tracking-tight ${
                  deviceInfo.type === "mobile"
                    ? "text-3xl"
                    : deviceInfo.type === "tablet"
                      ? "text-4xl"
                      : deviceInfo.type === "desktop"
                        ? "text-5xl"
                        : "text-6xl"
                }`}
              >
                {formatCurrency(total)}
              </div>
              <p className="text-sm text-gray-500 font-light">All-inclusive charter price</p>
            </div>

            {amenities.length > 0 && (
              <div className="space-y-3">
                <h4 className="uppercase tracking-wider text-gray-500 font-light text-xs">Featured Amenities</h4>
                <TooltipProvider delayDuration={150}>
                  <div className="flex flex-wrap gap-2">
                    {amenities.slice(0, 8).map((amenity, i) => {
                      const Icon = getAmenityIcon(amenity)
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all duration-200 touch-manipulation">
                              <Icon className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-light text-gray-700 truncate max-w-[120px]">{amenity}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {amenity}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                    {amenities.length > 8 && (
                      <div className="flex items-center px-3 py-2 text-sm text-gray-500 font-light">
                        +{amenities.length - 8} more
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="uppercase tracking-wider text-gray-500 font-light text-xs">Specifications</h4>
              <div className="grid grid-cols-2 gap-3">
                {aircraftTail?.year && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500 font-light">Year</div>
                      <div className="text-sm text-gray-900 font-medium">{aircraftTail.year}</div>
                    </div>
                  </div>
                )}
                {aircraftTail?.yearOfRefurbishment && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500 font-light">Refurbished</div>
                      <div className="text-sm text-gray-900 font-medium">{aircraftTail.yearOfRefurbishment}</div>
                    </div>
                  </div>
                )}
                {aircraftTail?.rangeNmOverride && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <Route className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500 font-light">Range</div>
                      <div className="text-sm text-gray-900 font-medium">{aircraftTail.rangeNmOverride} nm</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {option.conditions?.trim() && (
              <div className="space-y-2">
                <h4 className="uppercase tracking-wider text-gray-500 font-light text-xs">Special Notes</h4>
                <div className="text-sm text-gray-700 font-light leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
                  {option.conditions}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-6 lg:p-8 bg-gray-50/50">
            <Button
              className={`w-full font-medium tracking-wide rounded-xl transition-all duration-300 touch-manipulation shadow-lg hover:shadow-xl ${
                deviceInfo.type === "mobile"
                  ? "text-base py-4"
                  : deviceInfo.type === "tablet"
                    ? "text-base py-5"
                    : deviceInfo.type === "desktop"
                      ? "text-lg py-6"
                      : "text-xl py-7"
              } ${
                isSelected
                  ? "!bg-green-600 hover:!bg-green-700 !text-white border-0"
                  : hasSelectedOption && !isSelected
                    ? "!bg-gray-400 hover:!bg-gray-500 !text-white !border-gray-400"
                    : "!bg-gray-900 hover:!bg-black !text-white border-0"
              }`}
              onClick={onSelect}
              disabled={isLocked}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Selected Option
                </span>
              ) : (
                "Select This Aircraft"
              )}
            </Button>
            <p className="text-center text-xs text-gray-500 font-light mt-3">
              {isSelected ? "You've selected this option" : "Click to choose this aircraft for your charter"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
