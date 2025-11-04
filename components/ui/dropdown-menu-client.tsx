"use client"

import type * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * DropdownMenuClient - A fully client-side dropdown wrapper
 *
 * This component ensures the entire Radix dropdown tree (Root, Trigger, Portal, Content)
 * lives within an isolated Client Component, preventing SSR/hydration issues.
 *
 * This is the DEFINITIVE solution for dropdown issues in production:
 * - Isolates the entire Radix context tree within a single Client Component
 * - Doesn't depend on any layout or table rendered on server
 * - Works identically in development and production
 * - No need for portal hacks, useLayoutEffect, or manual positioning
 * - Prevents rendering at top-left or not appearing at all
 *
 * Usage:
 * <DropdownMenuClient
 *   trigger={<button>...</button>}
 * >
 *   <DropdownMenuPrimitive.Item>Profile</DropdownMenuPrimitive.Item>
 *   <DropdownMenuPrimitive.Item>Settings</DropdownMenuPrimitive.Item>
 *   <DropdownMenuPrimitive.Item>Logout</DropdownMenuPrimitive.Item>
 * </DropdownMenuClient>
 */
export function DropdownMenuClient({
  trigger,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 8,
  className,
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  className?: string
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild data-slot="dropdown-menu-trigger">
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          data-slot="dropdown-menu-content"
          className={cn(
            "bg-popover text-popover-foreground rounded-md border p-1 shadow-md z-[99999]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
