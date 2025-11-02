"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useAppHeader } from "./app-header-context"

export function AppHeader() {
  const { content } = useAppHeader()

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
      <SidebarTrigger />

      <Separator orientation="vertical" className="h-6" />

      <div className="flex flex-1 items-center justify-between">
        {content.title ? (
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-[#1E1E1E]">{content.title}</h1>
            {content.subtitle && <p className="text-sm text-[#6B7280]">{content.subtitle}</p>}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {content.actions && <div className="flex items-center gap-4">{content.actions}</div>}
      </div>
    </header>
  )
}
