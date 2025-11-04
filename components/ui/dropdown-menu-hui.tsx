"use client"

import * as React from "react"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import { cn } from "@/lib/utils"

/**
 * Headless UI dropdown menu alternative to Radix.
 * This component provides the same API surface as the Radix dropdown
 * but uses Headless UI under the hood for better production stability.
 */

interface DropdownMenuProps {
  children: React.ReactNode
  modal?: boolean
  onOpenChange?: (open: boolean) => void
}

function DropdownMenu({ children, onOpenChange }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    onOpenChange?.(open)
  }, [open])

  return <Menu>{() => <>{children}</>}</Menu>
}

interface DropdownMenuTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

function DropdownMenuTrigger({ asChild, children, onClick, className }: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <MenuButton
        as="div"
        className="inline-flex"
        onClick={(e: React.MouseEvent) => {
          onClick?.(e)
          children.props.onClick?.(e)
        }}
      >
        {children}
      </MenuButton>
    )
  }

  return (
    <MenuButton onClick={onClick} className={className}>
      {children}
    </MenuButton>
  )
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  onClick?: (e: React.MouseEvent) => void
  disableOutsidePointerEvents?: boolean
}

function DropdownMenuContent({
  children,
  className,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  onClick,
}: DropdownMenuContentProps) {
  // Calculate anchor position based on side and align
  const anchorMap = {
    top: { start: "top start", center: "top", end: "top end" },
    bottom: { start: "bottom start", center: "bottom", end: "bottom end" },
    left: { start: "left start", center: "left", end: "left end" },
    right: { start: "right start", center: "right", end: "right end" },
  }

  const anchor = anchorMap[side][align] as any

  return (
    <MenuItems
      anchor={anchor}
      onClick={onClick}
      className={cn(
        // Base styles matching shadcn
        "bg-popover text-popover-foreground pointer-events-auto",
        "z-[10000] min-w-[8rem]",
        "overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
        // Animations
        "transition duration-100 ease-out",
        "data-[closed]:scale-95 data-[closed]:opacity-0",
        // Offset
        side === "bottom" && `mt-[${sideOffset}px]`,
        side === "top" && `mb-[${sideOffset}px]`,
        side === "left" && `mr-[${sideOffset}px]`,
        side === "right" && `ml-[${sideOffset}px]`,
        className,
      )}
      style={{
        [side === "bottom" || side === "top" ? "marginTop" : "marginLeft"]:
          side === "bottom" ? sideOffset : side === "top" ? -sideOffset : side === "right" ? sideOffset : -sideOffset,
      }}
    >
      {children}
    </MenuItems>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  variant?: "default" | "destructive"
}

function DropdownMenuItem({ children, className, onClick, disabled, variant = "default" }: DropdownMenuItemProps) {
  return (
    <MenuItem disabled={disabled}>
      {({ focus }) => (
        <div
          onClick={onClick}
          className={cn(
            "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
            "outline-hidden select-none",
            focus && "bg-accent text-accent-foreground",
            disabled && "pointer-events-none opacity-50",
            variant === "destructive" && "text-destructive",
            variant === "destructive" && focus && "bg-destructive/10 dark:bg-destructive/20",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            "[&_svg:not([class*='text-'])]:text-muted-foreground",
            className,
          )}
        >
          {children}
        </div>
      )}
    </MenuItem>
  )
}

interface DropdownMenuLabelProps {
  children: React.ReactNode
  className?: string
}

function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return <div className={cn("px-2 py-1.5 text-sm font-medium", className)}>{children}</div>
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("bg-border -mx-1 my-1 h-px", className)} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
