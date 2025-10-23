"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AmenityIcon } from "@/components/ui/amenity-icon"
import { useAmenities } from "@/hooks/use-amenities"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AmenitySelectorProps {
  selectedAmenityIds: string[]
  onSelectionChange: (amenityIds: string[]) => void
  disabled?: boolean
}

export function AmenitySelector({ selectedAmenityIds, onSelectionChange, disabled = false }: AmenitySelectorProps) {
  const { amenities, loading, error } = useAmenities()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Group amenities by category
  const groupedAmenities = amenities.reduce((acc, amenity) => {
    const category = amenity.category || "Other"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(amenity)
    return acc
  }, {} as Record<string, typeof amenities>)

  const filteredAmenities = Object.entries(groupedAmenities).filter(([category, categoryAmenities]) => {
    if (!searchTerm) return true
    return category.toLowerCase().includes(searchTerm.toLowerCase()) ||
           categoryAmenities.some(amenity => 
             amenity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             amenity.description?.toLowerCase().includes(searchTerm.toLowerCase())
           )
  })

  const handleAmenityToggle = (amenityId: string) => {
    const isSelected = selectedAmenityIds.includes(amenityId)
    if (isSelected) {
      onSelectionChange(selectedAmenityIds.filter(id => id !== amenityId))
    } else {
      onSelectionChange([...selectedAmenityIds, amenityId])
    }
  }

  const selectedAmenities = amenities.filter(amenity => selectedAmenityIds.includes(amenity.id))

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading amenities...</div>
  }

  if (error) {
    return <div className="text-sm text-destructive">Error loading amenities: {error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Aircraft Amenities</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedAmenityIds.length > 0
                ? `${selectedAmenityIds.length} amenit${selectedAmenityIds.length === 1 ? 'y' : 'ies'} selected`
                : "Select amenities..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search amenities..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No amenities found.</CommandEmpty>
                {filteredAmenities.map(([category, categoryAmenities]) => (
                  <CommandGroup key={category} heading={category}>
                    {categoryAmenities.map((amenity) => {
                      const isSelected = selectedAmenityIds.includes(amenity.id)
                      return (
                        <CommandItem
                          key={amenity.id}
                          value={`${amenity.name} ${amenity.description || ''}`}
                          onSelect={() => handleAmenityToggle(amenity.id)}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleAmenityToggle(amenity.id)}
                            className="mr-2"
                          />
                          <AmenityIcon amenity={amenity} size={16} className="mr-2" />
                          <div className="flex-1">
                            <div className="font-medium">{amenity.name}</div>
                            {amenity.description && (
                              <div className="text-sm text-muted-foreground">{amenity.description}</div>
                            )}
                          </div>
                          {isSelected && <Check className="h-4 w-4" />}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected amenities display */}
      {selectedAmenities.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected Amenities:</div>
          <div className="flex flex-wrap gap-2">
            {selectedAmenities.map((amenity) => (
              <Badge
                key={amenity.id}
                variant="secondary"
                className="flex items-center space-x-1 px-2 py-1"
              >
                <AmenityIcon amenity={amenity} size={12} />
                <span>{amenity.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleAmenityToggle(amenity.id)}
                  disabled={disabled}
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
