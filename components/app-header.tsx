"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Moon, Sun, Building2, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useMockStore } from "@/lib/mock/store"
import clsx from "clsx"

export function AppHeader() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const { state } = useMockStore()
  const company = state.companies[0]

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6 dark:border-white/10">
      <SidebarTrigger />

      <div className="flex items-center gap-2">
        <span className="font-medium">{"Brokers Portal"}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative bg-transparent">
              {mounted && (
                <>
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </>
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[
              { key: "light", label: "Light" },
              { key: "dark", label: "Dark" },
              { key: "system", label: "System" },
            ].map((opt) => {
              const isActive =
                theme === opt.key ||
                (opt.key === "system" && theme === "system") ||
                (opt.key !== "system" && resolvedTheme === opt.key)
              return (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => setTheme(opt.key as "light" | "dark" | "system")}
                  className={clsx("flex items-center justify-between", isActive && "font-medium")}
                >
                  {opt.label}
                  {isActive && <Check className="h-4 w-4 opacity-70" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
