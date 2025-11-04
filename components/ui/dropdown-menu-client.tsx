"use client"

import type * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

export function DropdownMenuClient({
  trigger,
  items,
}: {
  trigger: React.ReactNode
  items: { label: string; onSelect?: () => void; variant?: "default" | "destructive" }[]
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild data-slot="dropdown-menu-trigger">
        {trigger}
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          data-slot="dropdown-menu-content"
          className="bg-popover text-popover-foreground rounded-md border p-1 shadow-md z-[99999] min-w-[8rem]"
        >
          {items.map((item, index) => (
            <DropdownMenuPrimitive.Item
              key={`${item.label}-${index}`}
              onSelect={item.onSelect}
              className={`cursor-pointer px-2 py-1.5 text-sm hover:bg-accent rounded-sm outline-none ${
                item.variant === "destructive" ? "text-destructive hover:bg-destructive/10" : ""
              }`}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
