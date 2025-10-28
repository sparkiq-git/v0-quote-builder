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

  const total = (option.cost_operator || 0) + (option.price_commission || 0) + (option.price_base || 0)

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
        return "w-full h-[216px] sm:h-[246px]"
      case "tablet":
        return "w-full h-[270px] md:h-[293px]"
      case "desktop":
        return "w-full h-[308px]"
      case "large-desktop":
        return "w-full h-[370px]"
      default:
        return "w-full h-[270px]"
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
    <div className="mx-auto w-full max-w-[1344px] px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 pb-3 sm:pb-4 md:pb-5 lg:pb-6 sm:pl-0 sm:pr-0">
      <style>{`
        .carousel-container .carousel-previous,
        .carousel-container .carousel-next,
        .carousel-container [aria-label*="image"] { 
          opacity: 0; 
          transition: opacity 0.3s ease;
          z-index: 30;
        }
        .carousel-container:hover .carousel-previous,
        .carousel-container:hover .carousel-next,
        .carousel-container:hover [aria-label*="image"] { 
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {images.length > 1 && (
              <>
                <CarouselPrevious
                  className={`absolute left-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/95 text-gray-900 backdrop-blur-sm border-0 shadow-xl hover:bg-white hover:shadow-2xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                    deviceInfo.type === "mobile" ? "h-8 w-8" : deviceInfo.type === "tablet" ? "h-9 w-9" : "h-10 w-10"
                  }`}
                  aria-label={`Previous image (${current} of ${count})`}
                />
                <CarouselNext
                  className={`absolute right-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/95 text-gray-900 backdrop-blur-sm border-0 shadow-xl hover:bg-white hover:shadow-2xl hover:scale-110 transition-all duration-300 touch-manipulation ${
                    deviceInfo.type === "mobile" ? "h-8 w-8" : deviceInfo.type === "tablet" ? "h-9 w-9" : "h-10 w-10"
                  }`}
                  aria-label={`Next image (${current + 2} of ${count})`}
                />
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20"
                  role="tablist"
                  aria-label="Image navigation"
                >
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      role="tab"
                      aria-selected={index === current}
                      aria-label={`View image ${index + 1} of ${count}`}
                      className={`h-1.5 rounded-full transition-all duration-300 touch-manipulation ${
                        index === current ? "w-8 bg-white shadow-lg" : "w-1.5 bg-white/70 hover:bg-white/90"
                      }`}
                      onClick={() => scrollTo(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </Carousel>

          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3 lg:p-4 z-20">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0 space-y-1">
                <h2
                  className={`font-light text-white tracking-tight leading-tight drop-shadow-2xl py-[-4px] py-[-4px] my-[-4px] ${
                    deviceInfo.type === "mobile"
                      ? "text-xl sm:text-2xl"
                      : deviceInfo.type === "tablet"
                        ? "text-2xl sm:text-3xl"
                        : "text-3xl lg:text-4xl"
                  }`}
                >
                  {aircraftModel?.name || "Aircraft Model"}
                </h2>
                <p
                  className={`text-white/95 font-light tracking-wide drop-shadow-lg ${
                    deviceInfo.type === "mobile"
                      ? "text-sm sm:text-base"
                      : deviceInfo.type === "tablet"
                        ? "text-base sm:text-lg"
                        : "text-lg lg:text-xl"
                  }`}
                >
                  {aircraftModel?.manufacturer || "Aircraft Manufacturer"}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-full shadow-lg">
                    <Users className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                    <span className="text-xs font-medium text-white">{capacity} passengers</span>
                  </div>
                  {aircraftTail?.year && (
                    <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-full shadow-lg">
                      <Calendar className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                      <span className="text-xs font-medium text-white">{aircraftTail.year}</span>
                    </div>
                  )}
                  {aircraftTail?.speedKnotsOverride && (
                    <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-full shadow-lg">
                      <Gauge className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                      <span className="text-xs font-medium text-white">{aircraftTail.speedKnotsOverride} kts</span>
                    </div>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-2xl border-2 border-white/30">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold text-xs tracking-wide">Selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-3 lg:p-4 space-y-3">
          {/* Pricing and Specifications Grid - Side by Side on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Pricing Section - Left Column on Desktop */}
            <div className="space-y-1">
              <span className="uppercase tracking-widest text-gray-500 font-medium text-[10px]">
                Total Charter Price
              </span>
              <div
                className={`font-light text-gray-900 tracking-tight ${
                  deviceInfo.type === "mobile"
                    ? "text-3xl sm:text-4xl"
                    : deviceInfo.type === "tablet"
                      ? "text-4xl sm:text-5xl"
                      : "text-5xl lg:text-6xl"
                }`}
              >
                {formatCurrency(total)}
              </div>
              <p className="text-xs text-gray-600 font-light">All-inclusive pricing with taxes and fees</p>
            </div>

            {/* Specifications Grid - Right Column on Desktop */}
            <div className="space-y-2">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-[10px]">
                Aircraft Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {aircraftTail?.year && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Year</div>
                      <div className="text-sm text-gray-900 font-semibold">{aircraftTail.year}</div>
                    </div>
                  </div>
                )}
                {aircraftTail?.yearOfRefurbishment && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Refurbished</div>
                      <div className="text-sm text-gray-900 font-semibold">{aircraftTail.yearOfRefurbishment}</div>
                    </div>
                  </div>
                )}
                {aircraftTail?.rangeNmOverride && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                      <Route className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Range</div>
                      <div className="text-sm text-gray-900 font-semibold">{aircraftTail.rangeNmOverride} nm</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Amenities Section */}
          {amenities.length > 0 && (
            <div className="space-y-2">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-[10px]">Featured Amenities</h3>
              <TooltipProvider delayDuration={150}>
                <div className="flex flex-wrap gap-2">
                  {amenities.slice(0, 8).map((amenity, i) => {
                    const Icon = getAmenityIcon(amenity)
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 touch-manipulation">
                            <Icon className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" aria-hidden="true" />
                            <span className="text-xs font-light text-gray-700 truncate max-w-[120px]">{amenity}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {amenity}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                  {amenities.length > 8 && (
                    <div className="flex items-center px-3 py-1.5 text-xs text-gray-500 font-light">
                      +{amenities.length - 8} more
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}

          {/* Special Notes */}
          {option.conditions?.trim() && (
            <div className="space-y-2">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-[10px]">Special Notes</h3>
              <div className="text-xs text-gray-700 font-light leading-relaxed bg-amber-50 border-l-4 border-amber-400 rounded-lg p-3">
                {option.conditions}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white p-3 sm:p-3 lg:p-4">
          <Button
            className={`w-full font-semibold tracking-wide rounded-xl transition-all duration-300 touch-manipulation shadow-lg hover:shadow-2xl active:scale-[0.98] ${
              deviceInfo.type === "mobile"
                ? "text-base py-2"
                : deviceInfo.type === "tablet"
                  ? "text-lg py-3"
                  : "text-lg py-3"
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
              <span className="flex items-center justify-center gap-2.5">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                Selected Option
              </span>
            ) : (
              "Select This Aircraft"
            )}
          </Button>
          <p className="text-center text-xs text-gray-600 font-light mt-3 leading-relaxed">
            {isSelected
              ? "You've selected this aircraft for your charter"
              : "Click to choose this aircraft and proceed with your booking"}
          </p>
        </div>
      </Card>
    </div>
  )
}
