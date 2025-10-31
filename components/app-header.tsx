"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ModeToggle } from "@/components/mode-toggle"

export function AppHeader() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
      <SidebarTrigger />

      <Separator orientation="vertical" className="h-6" />

      <div className="flex flex-1 items-center justify-between">
        <div className="flex-1" />
        {mounted && (
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        )}
      </div>
    </header>
  )
}
