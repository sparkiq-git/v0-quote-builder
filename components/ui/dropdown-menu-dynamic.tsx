"use client"

import dynamic from "next/dynamic"

export const DropdownMenu = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenu })),
  { ssr: false },
)

export const DropdownMenuTrigger = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuTrigger })),
  { ssr: false },
)

export const DropdownMenuContent = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuContent })),
  {
    ssr: false,
    loading: () => null,
  },
)

export const DropdownMenuItem = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuItem })),
  { ssr: false },
)

export const DropdownMenuLabel = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuLabel })),
  { ssr: false },
)

export const DropdownMenuSeparator = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuSeparator })),
  { ssr: false },
)

export const DropdownMenuGroup = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuGroup })),
  { ssr: false },
)

export const DropdownMenuPortal = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuPortal })),
  { ssr: false },
)

export const DropdownMenuSub = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuSub })),
  { ssr: false },
)

export const DropdownMenuSubContent = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuSubContent })),
  { ssr: false },
)

export const DropdownMenuSubTrigger = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuSubTrigger })),
  { ssr: false },
)

export const DropdownMenuRadioGroup = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuRadioGroup })),
  { ssr: false },
)

export const DropdownMenuCheckboxItem = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuCheckboxItem })),
  { ssr: false },
)

export const DropdownMenuRadioItem = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuRadioItem })),
  { ssr: false },
)

export const DropdownMenuShortcut = dynamic(
  () => import("@/components/ui/dropdown-menu").then((mod) => ({ default: mod.DropdownMenuShortcut })),
  { ssr: false },
)
