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
import { Wifi, Coffee, Tv, Utensils, Bed, Headphones, Zap, Shield, Star, CheckCircle } from "lucide-react"

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

  const getImageSrc = (image: string) =>
    failedImages.includes(image)
      ? `/placeholder.svg?height=600&width=1000&query=${encodeURIComponent(
          `${aircraftModel?.name || 'Aircraft'} aircraft placeholder`,
        )}`
      : image

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
        <Card className="relative rounded-3xl bg-white shadow-xl hover:shadow-2xl transition overflow-hidden p-0">
          <div className="flex flex-col md:flex-row">
            {/* CAROUSEL — NOW FIRST ON MOBILE, STILL RIGHT ON DESKTOP */}
            <div className="order-1 md:order-2 relative w-full md:w-[58%] md:m-0 rounded-t-3xl md:rounded-none overflow-hidden">
              <div className="carousel-container w-full">
                <div className="w-full aspect-[3/1] h-28 sm:h-32 md:aspect-auto md:h-90 bg-black/[0.02]">
                  <Carousel className="w-full h-full" setApi={setApi}>
                    <CarouselContent className="h-full">
                      {images.map((img, i) => (
                        <CarouselItem key={i} className="basis-full h-full">
                          <div className="h-28 sm:h-32 w-full grid place-items-center">
                            <img
                              src={getImageSrc(img) || "/placeholder.svg"}
                              alt={`${aircraftModel?.name || 'Aircraft'} - Image ${i + 1}`}
                              className="max-w-full max-h-full place-items-center object-cover md:object-contain w-full h-28 sm:h-32"
                              loading={i === 0 ? "eager" : "lazy"}
                              decoding="async"
                              onError={() => setFailedImages((p) => (p.includes(img) ? p : [...p, img]))}
                              onLoad={() => setFailedImages((p) => p.filter((f) => f !== img))}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>

                    {images.length > 1 && (
                      <>
                        <CarouselPrevious
                          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-md border-0 shadow-lg hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Previous image"
                        />
                        <CarouselNext
                          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-md border-0 shadow-lg hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
                          aria-label="Next image"
                        />
                        <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {Array.from({ length: count }).map((_, index) => (
                            <button
                              key={index}
                              className={`h-2 w-2 rounded-full ${
                                index === current ? "bg-white scale-125" : "bg-white/50"
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

            {/* INFO SECTION - NOW SECOND ON MOBILE */}
            <div className="order-2 md:order-1 flex flex-col w-full md:w-[42%] bg-white pt-6 md:pt-6 p-4 md:p-6">
              <div className="flex-1 px-4 md:px-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-gray-900 leading-tight">
                    {aircraftModel?.name || 'Aircraft Model'}
                  </h3>
                  <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{capacity} passengers</span>
                </div>

                {amenities.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-600 mb-2">Amenities</div>

                    {/* Only shadcn tooltip */}
                    <TooltipProvider delayDuration={150}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                        {amenities.slice(0, 6).map((amenity, i) => {
                          const Icon = getAmenityIcon(amenity)
                          return (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-xs font-medium">
                                  <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                                  <span className="truncate">{amenity}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-xs break-words">
                                {amenity}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                        {amenities.length > 6 && (
                          <div className="col-span-2 sm:col-span-3 flex items-center gap-2 text-xs text-gray-500">
                            <Star className="h-4 w-4" />
                            <span>+{amenities.length - 6} more amenities</span>
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                {option.conditions?.trim() && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-600 mb-1">Special Notes</div>
                    <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg">{option.conditions}</div>
                  </div>
                )}
              </div>

              {/* Sticky total + CTA on mobile */}
              <div className="border-t border-gray-200 bg-white sticky bottom-0 md:static z-10">
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-semibold text-gray-900">Total Cost:</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</span>
                </div>
                <div className="pb-3 pt-0">
                  <Button
                    className={`w-full font-semibold ${
                      isSelected
                        ? "!bg-blue-700 hover:!bg-blue-800 !text-white"
                        : hasSelectedOption && !isSelected
                          ? "!bg-gray-400 hover:!bg-gray-500 !text-white !border-gray-400"
                          : "!bg-blue-700 hover:!bg-blue-800 !text-white"
                    }`}
                    onClick={onSelect}
                    disabled={isLocked}
                  >
                    {isSelected ? "Selected" : "Select This Option"}
                  </Button>
                </div>
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
