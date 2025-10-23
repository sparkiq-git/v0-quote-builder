import React from "react"
import { LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"

interface AmenityIconProps {
  amenity: {
    icon_type?: string
    icon_ref?: string
  }
  className?: string
  size?: number
}

export function AmenityIcon({ amenity, className, size = 16 }: AmenityIconProps) {
  const { icon_type, icon_ref } = amenity

  if (!icon_type || !icon_ref) {
    // Default icon if no icon is specified
    const DefaultIcon = LucideIcons.Package
    return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
  }

  if (icon_type === "internal") {
    // Use Lucide icon
    const IconComponent = LucideIcons[icon_ref as keyof typeof LucideIcons] as LucideIcon
    
    if (!IconComponent) {
      console.warn(`Lucide icon "${icon_ref}" not found, using default`)
      const DefaultIcon = LucideIcons.Package
      return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
    }

    return <IconComponent className={cn("text-foreground", className)} size={size} />
  }

  if (icon_type === "external") {
    // Use external image from Supabase storage
    return (
      <img
        src={icon_ref}
        alt="Amenity icon"
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fallback to default icon if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            const DefaultIcon = LucideIcons.Package
            const iconElement = <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
            parent.appendChild(iconElement as any)
          }
        }}
      />
    )
  }

  // Fallback for unknown icon types
  const DefaultIcon = LucideIcons.Package
  return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
}
