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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import type { QuoteOption } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/format"
import { useDeviceDetection, deviceLayouts } from "@/hooks/use-device-detection"
import { Wifi, Coffee, Tv, Utensils, Bed, Headphones, Zap, Shield, Star, CheckCircle } from "lucide-react"

const MAX_OPTION_IMAGES = 6

const placeholderImage = (label: string) =>
  `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(`${label || "Aircraft"} aircraft`)}`

const isLikelyValidImageUrl = (src: string) => {
  if (!src) return false
  const trimmed = src.trim()
  if (!trimmed || trimmed.includes("undefined") || trimmed.includes("[object")) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (/^\/\//.test(trimmed)) return true
  if (trimmed.startsWith("/")) return true
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return true
  if (trimmed.startsWith("storage/") || trimmed.startsWith("aircraft-media/")) return true
  return false
}

const normalizeImageSource = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === "string") return value.trim()
  if (typeof value === "object") {
    const candidate =
      (value as Record<string, unknown>).public_url ??
      (value as Record<string, unknown>).publicUrl ??
      (value as Record<string, unknown>).url ??
      (value as Record<string, unknown>).src
    if (typeof candidate === "string") {
      return candidate.trim()
    }
  }
  return null
}

const absolutizeImageUrl = (src: string) => {
  const trimmed = src.trim()
  if (!trimmed) return trimmed

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")
  if (!supabaseUrl) {
    return trimmed
  }

  if (trimmed.startsWith("storage/v1/object/public/")) {
    return `${supabaseUrl}/${trimmed}`
  }

  if (trimmed.startsWith("aircraft-media/")) {
    return `${supabaseUrl}/storage/v1/object/public/${trimmed}`
  }

  if (trimmed.startsWith("avatar/") || trimmed.startsWith("tenant/")) {
    return `${supabaseUrl}/storage/v1/object/public/${trimmed}`
  }

  return trimmed
}

const collectOptionImages = (option: QuoteOption, fallbackLabel: string) => {
  const rawImages: unknown[] = [
    ...(Array.isArray((option as any)?.overrideImages) ? (option as any).overrideImages : []),
    ...(Array.isArray(option.aircraftTail?.images) ? option.aircraftTail!.images : []),
    ...(Array.isArray(option.aircraftModel?.images) ? option.aircraftModel!.images : []),
  ]

  const normalized = rawImages
    .map(normalizeImageSource)
    .filter((value): value is string => typeof value === "string" && isLikelyValidImageUrl(value))
    .map(absolutizeImageUrl)

  const unique = Array.from(new Set(normalized)).filter(isLikelyValidImageUrl)

  if (unique.length === 0) {
    return [placeholderImage(fallbackLabel)]
  }

  return unique.slice(0, MAX_OPTION_IMAGES)
}

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
  const fallbackLabel = aircraftModel?.name || option.label || "Aircraft"

  const total = (option.cost_operator || 0) + (option.price_commission || 0) + (option.price_base || 0)

  const images = collectOptionImages(option, fallbackLabel)

  const getImageSrc = (image: string) => {
    const absolute = absolutizeImageUrl(image)
    if (failedImages.includes(absolute)) {
      return placeholderImage(fallbackLabel)
    }

    if (!isLikelyValidImageUrl(absolute)) {
      return placeholderImage(fallbackLabel)
    }

    return absolute
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
  const capacity = aircraftTail?.capacityOverride || aircraftModel?.defaultCapacity || 8

  const hasSpecifications =
    aircraftTail?.year ||
    capacity ||
    aircraftTail?.speedKnotsOverride ||
    aircraftModel?.defaultSpeedKnots ||
    aircraftTail?.rangeNmOverride ||
    aircraftModel?.defaultRangeNm

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
                      src={getImageSrc(img) || placeholderImage(fallbackLabel)}
                      alt={`${aircraftModel?.name || "Aircraft"} - View ${i + 1} of ${images.length}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        console.warn(`Failed to load image: ${img}`, e)
                        const key = getImageSrc(img)
                        setFailedImages((p) => (key && !p.includes(key) ? [...p, key] : p))
                      }}
                      onLoad={() => {
                        const key = getImageSrc(img)
                        setFailedImages((p) => (key ? p.filter((f) => f !== key) : p))
                      }}
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
                <div className="flex items-center gap-2 flex-wrap">
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

                  {hasSpecifications && (
                    <TooltipProvider delayDuration={150}>
                      <div className="flex items-center gap-2 text-white/90 font-light drop-shadow-lg">
                         {aircraftTail?.year && (
                           <>
                             <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs sm:text-sm cursor-help">{aircraftTail.year}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Year of Refurbishment</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {capacity && (
                          <>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/70" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs sm:text-sm cursor-help">{capacity} PAX</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Maximum Capacity</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {(aircraftTail?.speedKnotsOverride || aircraftModel?.defaultSpeedKnots) && (
                          <>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/70" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs sm:text-sm cursor-help">
                                  {aircraftTail?.speedKnotsOverride || aircraftModel?.defaultSpeedKnots} kts
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Aircraft Speed</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {(aircraftTail?.rangeNmOverride || aircraftModel?.defaultRangeNm) && (
                          <>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white/70" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs sm:text-sm cursor-help">
                                  {aircraftTail?.rangeNmOverride || aircraftModel?.defaultRangeNm} nm
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Aircraft Range</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </TooltipProvider>
                  )}
                </div>

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {amenities.slice(0, 6).map((amenity, i) => {
                      const Icon = getAmenityIcon(amenity)
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-full shadow-lg"
                        >
                          <Icon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                          <span className="text-xs font-medium text-white truncate max-w-[120px]">{amenity}</span>
                        </div>
                      )
                    })}
                    {amenities.length > 6 && (
                      <div className="flex items-center gap-1.5 bg-white/25 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-full shadow-lg">
                        <span className="text-xs font-medium text-white">+{amenities.length - 6} more</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-1.5 rounded-full shadow-2xl border-2 border-white/30">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="font-semibold text-xs tracking-wide">Selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-2 sm:p-2 lg:p-2.5 space-y-2">
          {/* Pricing and Specifications Grid - Side by Side on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-4" data-device-type={deviceInfo.type}>
            {/* Pricing Section - Left Column on Desktop */}
            <div className="space-y-0.5">
              <span className="uppercase tracking-widest text-gray-500 font-medium text-[7px]">
                Total Charter Price
              </span>
              <div
                className={`font-light text-gray-900 tracking-tight ${
                  deviceInfo.type === "mobile"
                    ? "text-xl sm:text-2xl"
                    : deviceInfo.type === "tablet"
                      ? "text-2xl sm:text-3xl"
                      : "text-3xl lg:text-4xl"
                }`}
              >
                {formatCurrency(total)}
              </div>
              <p className="text-[8.4px] text-gray-600 font-light">All-inclusive pricing with taxes and fees</p>
            </div>

            <div className="space-y-2">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-[7px]">Option Notes</h3>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 min-h-[60px]">
                {option.notes ? (
                  <p className="text-xs text-gray-700 font-light leading-relaxed">{option.notes}</p>
                ) : (
                  <p className="text-xs text-gray-400 font-light italic">No additional notes for this option</p>
                )}
              </div>
            </div>
          </div>

          {/* Special Notes */}
          {option.conditions?.trim() && (
            <div className="space-y-2">
              <h3 className="uppercase tracking-widest text-gray-500 font-medium text-[7px]">Special Notes</h3>
              <div className="text-[8.4px] text-gray-700 font-light leading-relaxed bg-amber-50 border-l-4 border-amber-400 rounded-lg p-3">
                {option.conditions}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white p-2 sm:p-2 lg:p-2.5">
          <Button
            className={`w-full font-semibold tracking-wide rounded-xl transition-all duration-300 touch-manipulation shadow-lg hover:shadow-2xl active:scale-[0.98] ${
              deviceInfo.type === "mobile"
                ? "text-base py-2"
                : deviceInfo.type === "tablet"
                  ? "text-lg py-3"
                  : "text-lg py-3"
            } ${
              isSelected
                ? "!bg-gray-600 hover:!bg-gray-700 !text-white border-0"
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
          <p className="text-center text-[8.4px] text-gray-600 font-light mt-3 leading-relaxed">
            {isSelected
              ? "You've selected this aircraft for your charter"
              : "Click to choose this aircraft and proceed with your booking"}
          </p>
        </div>
      </Card>
    </div>
  )
}
