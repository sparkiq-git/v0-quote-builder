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

  const getCardClasses = () => {
    const baseClasses =
      "relative bg-white shadow-md border border-gray-200 hover:shadow-xl transition-all duration-500 overflow-hidden"

    switch (deviceInfo.type) {
      case "mobile":
        return `${baseClasses} rounded-2xl`
      case "tablet":
        return `${baseClasses} rounded-2xl md:rounded-3xl`
      case "desktop":
        return `${baseClasses} rounded-3xl`
      case "large-desktop":
        return `${baseClasses} rounded-3xl`
      default:
        return baseClasses
    }
  }

  const getImageClasses = () => {
    switch (deviceInfo.type) {
      case "mobile":
        return "w-full h-[400px] sm:h-[450px]"
      case "tablet":
        return "w-full h-[500px] md:h-[550px]"
      case "desktop":
        return "w-full h-[600px]"
      case "large-desktop":
        return "w-full h-[700px]"
      default:
        return "w-full h-[500px]"
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
    <div className="mx-auto w-full max-w-screen-xl px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
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
            opacity: 0.8; 
          }
        }
      `}</style>

      <Card className={getCardClasses()} role="article" aria-label={`${aircraftModel?.name} charter option`}>
        {/* Image Section with Overlay */}
        <div className="carousel-container relative w-full group">
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {images.map((img, i) => (
                <CarouselItem key={i} className="basis-full">
                  <div className={`relative overflow-hidden ${getImageClasses()}`}>
                    <img
                      src={getImageSrc(img) || "/placeholder.svg"}
                      alt={`${aircraftModel?.name || "Aircraft"} - View ${i + 1} of ${images.length}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        console.warn(`Failed to load image: ${img}`, e)
                        setFailedImages((p) => (p.includes(img) ? p : [...p, img]))
                      }}
                      onLoad={() => setFailedImages((p) => p.filter((f) => f !== img))}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {images.length > 1 && (
              <>
                <CarouselPrevious
                  className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-gray-900 backdrop-blur-sm border-0 shadow-xl hover:bg-white hover:shadow-2xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                    deviceInfo.type === "mobile"
                      ? "h-10 w-10"
                      : deviceInfo.type === "tablet"
                        ? "h-11 w-11"
                        : "h-12 w-12"
                  }`}
                  aria-label={`Previous image (${current} of ${count})`}
                />
                <CarouselNext
                  className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/95 text-gray-900 backdrop-blur-sm border-0 shadow-xl hover:bg-white hover:shadow-2xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                    deviceInfo.type === "mobile"
                      ? "h-10 w-10"
                      : deviceInfo.type === "tablet"
                        ? "h-11 w-11"
                        : "h-12 w-12"
                  }`}
                  aria-label={`Next image (${current + 2} of ${count})`}
                />
                <div
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10"
                  role="tablist"
                  aria-label="Image navigation"
                >
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      role="tab"
                      aria-selected={index === current}
                      aria-label={`View image ${index + 1} of ${count}`}
                      className={`h-2 rounded-full transition-all duration-300 touch-manipulation ${
                        index === current ? "w-10 bg-white shadow-lg" : "w-2 bg-white/70 hover:bg-white/90"
                      }`}
                      onClick={() => scrollTo(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </Carousel>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-10 z-10">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0 space-y-3">
                <h2
                  className={`font-light text-white tracking-tight leading-tight drop-shadow-2xl ${
                    deviceInfo.type === "mobile"
                      ? "text-3xl sm:text-4xl"
                      : deviceInfo.type === "tablet"
                        ? "text-4xl sm:text-5xl"
                        : "text-5xl lg:text-6xl"
                  }`}
                >
                  {aircraftModel?.name || "Aircraft Model"}
                </h2>
                <p
                  className={`text-white/95 font-light tracking-wide drop-shadow-lg ${
                    deviceInfo.type === "mobile"
                      ? "text-base sm:text-lg"
                      : deviceInfo.type === "tablet"
                        ? "text-lg sm:text-xl"
                        : "text-xl lg:text-2xl"
                  }`}
                >
                  {aircraftModel?.manufacturer || "Aircraft Manufacturer"}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-lg">
                    <Users className="h-4 w-4 text-white" aria-hidden="true" />
                    <span className="text-sm font-medium text-white">{capacity} passengers</span>
                  </div>
                  {aircraftTail?.year && (
                    <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-lg">
                      <Calendar className="h-4 w-4 text-white" aria-hidden="true" />
                      <span className="text-sm font-medium text-white">{aircraftTail.year}</span>
                    </div>
                  )}
                  {aircraftTail?.speedKnotsOverride && (
                    <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-lg">
                      <Gauge className="h-4 w-4 text-white" aria-hidden="true" />
                      <span className="text-sm font-medium text-white">{aircraftTail.speedKnotsOverride} kts</span>
                    </div>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-white/30">
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold text-sm tracking-wide">Selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 space-y-8">
          {/* Pricing Section */}
          <div className="space-y-2">
            <span className="uppercase tracking-widest text-gray-500 font-medium text-xs">Total Charter Price</span>
            <div
              className={`font-light text-gray-900 tracking-tight ${
                deviceInfo.type === "mobile"
                  ? "text-4xl sm:text-5xl"
                  : deviceInfo.type === "tablet"
                    ? "text-5xl sm:text-6xl"
                    : "text-6xl lg:text-7xl"
              }`}
            >
              {formatCurrency(total)}
            </div>
            <p className="text-sm text-gray-600 font-light">All-inclusive pricing with taxes and fees</p>
          </div>

          {/* Amenities Section */}
          {amenities.length > 0 && (
            <div className="space-y-4">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-xs">Featured Amenities</h3>
              <TooltipProvider delayDuration={150}>
                <div className="flex flex-wrap gap-3">
                  {amenities.slice(0, 8).map((amenity, i) => {
                    const Icon = getAmenityIcon(amenity)
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 touch-manipulation">
                            <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" aria-hidden="true" />
                            <span className="text-sm font-light text-gray-700 truncate max-w-[140px]">{amenity}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {amenity}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                  {amenities.length > 8 && (
                    <div className="flex items-center px-4 py-2.5 text-sm text-gray-500 font-light">
                      +{amenities.length - 8} more amenities
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}

          {/* Specifications Grid */}
          <div className="space-y-4">
            <h3 className="uppercase tracking-widest text-gray-500 font-medium text-xs">Aircraft Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aircraftTail?.year && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-gray-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Year</div>
                    <div className="text-base text-gray-900 font-semibold">{aircraftTail.year}</div>
                  </div>
                </div>
              )}
              {aircraftTail?.yearOfRefurbishment && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-gray-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Refurbished</div>
                    <div className="text-base text-gray-900 font-semibold">{aircraftTail.yearOfRefurbishment}</div>
                  </div>
                </div>
              )}
              {aircraftTail?.rangeNmOverride && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                    <Route className="h-5 w-5 text-gray-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Range</div>
                    <div className="text-base text-gray-900 font-semibold">{aircraftTail.rangeNmOverride} nm</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Notes */}
          {option.conditions?.trim() && (
            <div className="space-y-3">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-xs">Special Notes</h3>
              <div className="text-sm text-gray-700 font-light leading-relaxed bg-amber-50 border-l-4 border-amber-400 rounded-lg p-5">
                {option.conditions}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white p-6 sm:p-8 lg:p-10">
          <Button
            className={`w-full font-semibold tracking-wide rounded-2xl transition-all duration-300 touch-manipulation shadow-lg hover:shadow-2xl active:scale-[0.98] ${
              deviceInfo.type === "mobile"
                ? "text-lg py-5"
                : deviceInfo.type === "tablet"
                  ? "text-xl py-6"
                  : "text-xl py-7 lg:py-8"
            } ${
              isSelected
                ? "!bg-green-600 hover:!bg-green-700 !text-white border-0"
                : hasSelectedOption && !isSelected
                  ? "!bg-gray-400 hover:!bg-gray-500 !text-white !border-gray-400"
                  : "!bg-gray-900 hover:!bg-black !text-white border-0"
            }`}
            onClick={onSelect}
            disabled={isLocked}
            aria-label={isSelected ? "Currently selected option" : "Select this aircraft for your charter"}
          >
            {isSelected ? (
              <span className="flex items-center justify-center gap-3">
                <CheckCircle className="h-6 w-6" aria-hidden="true" />
                Selected Option
              </span>
            ) : (
              "Select This Aircraft"
            )}
          </Button>
          <p className="text-center text-sm text-gray-600 font-light mt-4 leading-relaxed">
            {isSelected
              ? "You've selected this aircraft for your charter"
              : "Click to choose this aircraft and proceed with your booking"}
          </p>
        </div>
      </Card>
    </div>
  )
}
