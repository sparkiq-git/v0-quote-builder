import React, { useState } from "react"
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

// Icon name mapping for common database icon names to Lucide names
const iconNameMap: Record<string, string> = {
  'utensils': 'Utensils',
  'cable': 'Cable',
  'wifi': 'Wifi',
  'tv': 'Tv',
  'phone': 'Phone',
  'music': 'Music',
  'coffee': 'Coffee',
  'bed': 'Bed',
  'chair': 'Chair',
  'table': 'Table',
  'lamp': 'Lamp',
  'book': 'Book',
  'gamepad': 'Gamepad2',
  'headphones': 'Headphones',
  'camera': 'Camera',
  'video': 'Video',
  'microphone': 'Mic',
  'speaker': 'Speaker',
  'monitor': 'Monitor',
  'keyboard': 'Keyboard',
  'mouse': 'Mouse',
  'printer': 'Printer',
  'scanner': 'Scan',
  'fax': 'Fax',
  'calculator': 'Calculator',
  'calendar': 'Calendar',
  'clock': 'Clock',
  'alarm': 'AlarmClock',
  'stopwatch': 'Timer',
  'thermometer': 'Thermometer',
  'gauge': 'Gauge',
  'compass': 'Compass',
  'map': 'Map',
  'globe': 'Globe',
  'flag': 'Flag',
  'shield': 'Shield',
  'lock': 'Lock',
  'key': 'Key',
  'tag': 'Tag',
  'label': 'Tag',
  'sticker': 'Sticker',
  'badge': 'Badge',
  'medal': 'Medal',
  'trophy': 'Trophy',
  'star': 'Star',
  'heart': 'Heart',
  'thumbs-up': 'ThumbsUp',
  'thumbs-down': 'ThumbsDown',
  'like': 'Heart',
  'dislike': 'X',
  'check': 'Check',
  'cross': 'X',
  'plus': 'Plus',
  'minus': 'Minus',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  'chevron-up': 'ChevronUp',
  'chevron-down': 'ChevronDown',
  'chevron-left': 'ChevronLeft',
  'chevron-right': 'ChevronRight',
  'play': 'Play',
  'pause': 'Pause',
  'stop': 'Square',
  'record': 'Circle',
  'rewind': 'Rewind',
  'fast-forward': 'FastForward',
  'skip-back': 'SkipBack',
  'skip-forward': 'SkipForward',
  'volume-up': 'Volume2',
  'volume-down': 'Volume1',
  'volume-off': 'VolumeX',
  'mute': 'VolumeX',
  'unmute': 'Volume2',
  'settings': 'Settings',
  'gear': 'Settings',
  'cog': 'Settings',
  'wrench': 'Wrench',
  'screwdriver': 'Screwdriver',
  'hammer': 'Hammer',
  'saw': 'Saw',
  'drill': 'Drill',
  'screw': 'Screw',
  'nut': 'Nut',
  'bolt': 'Bolt',
  'nail': 'Nail',
  'pin': 'Pin',
  'clip': 'Paperclip',
  'staple': 'Staple',
  'tape': 'Tape',
  'glue': 'Glue',
  'paint': 'Palette',
  'brush': 'Brush',
  'pencil': 'Pencil',
  'pen': 'Pen',
  'marker': 'Highlighter',
  'crayon': 'Crayon',
  'chalk': 'Chalk',
  'eraser': 'Eraser',
  'ruler': 'Ruler',
  'protractor': 'Protractor',
  'compass': 'Compass',
  'triangle': 'Triangle',
  'square': 'Square',
  'circle': 'Circle',
  'oval': 'Circle',
  'rectangle': 'Rectangle',
  'diamond': 'Diamond',
  'hexagon': 'Hexagon',
  'octagon': 'Octagon',
  'pentagon': 'Pentagon',
  'star': 'Star',
  'heart': 'Heart',
  'spade': 'Spade',
  'club': 'Club',
  'diamond': 'Diamond',
  'joker': 'Joker',
  'ace': 'Ace',
  'king': 'Crown',
  'queen': 'Crown',
  'jack': 'Jack',
  'ten': '10',
  'nine': '9',
  'eight': '8',
  'seven': '7',
  'six': '6',
  'five': '5',
  'four': '4',
  'three': '3',
  'two': '2',
  'one': '1',
  'zero': '0'
}

export function AmenityIcon({ amenity, className, size = 16 }: AmenityIconProps) {
  const { icon_type, icon_ref } = amenity
  const [imageError, setImageError] = useState(false)

  if (!icon_type || !icon_ref) {
    // Default icon if no icon is specified
    const DefaultIcon = LucideIcons.Package
    return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
  }

  if (icon_type === "internal") {
    // Map database icon name to Lucide icon name
    const mappedIconName = iconNameMap[icon_ref.toLowerCase()] || icon_ref
    const IconComponent = LucideIcons[mappedIconName as keyof typeof LucideIcons] as LucideIcon
    
    if (!IconComponent) {
      console.warn(`Lucide icon "${icon_ref}" (mapped to "${mappedIconName}") not found, using default`)
      const DefaultIcon = LucideIcons.Package
      return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
    }

    return <IconComponent className={cn("text-foreground", className)} size={size} />
  }

  if (icon_type === "external") {
    // Use external image from Supabase storage
    if (imageError) {
      // Show default icon if image failed to load
      const DefaultIcon = LucideIcons.Package
      return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
    }

    return (
      <img
        src={icon_ref}
        alt="Amenity icon"
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    )
  }

  // Fallback for unknown icon types
  const DefaultIcon = LucideIcons.Package
  return <DefaultIcon className={cn("text-muted-foreground", className)} size={size} />
}
