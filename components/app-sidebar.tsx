"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  FileText,
  Plane,
  RotateCcw,
  Settings,
  UserCog,
  Building2,
  UserCircle,
  ChevronDown,
} from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { cn } from "@/lib/utils"

const mainNavigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    title: "Quotes",
    href: "/quotes",
    icon: FileText,
  },
]

const operationsNavigation = [
  {
    title: "Aircraft",
    href: "/operations/aircraft",
    icon: Plane,
  },
  {
    title: "FBOs",
    href: "/operations/fbos",
    icon: Building2,
  },
  {
    title: "Passengers",
    href: "/operations/passengers",
    icon: UserCircle,
  },
  {
    title: "Crew",
    href: "/operations/crew",
    icon: UserCog,
  },
]

const settingsNavigation = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state, dispatch, getMetrics } = useMockStore()
  const metrics = getMetrics()

  const [isOperationsExpanded, setIsOperationsExpanded] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (pathname.startsWith("/operations/")) {
      setIsOperationsExpanded(true)
    }
  }, [pathname])

  const handleOperationsClick = () => {
    setIsOperationsExpanded((prev) => !prev)
  }

  const handleOperationsMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setIsOperationsExpanded(true)
  }

  const handleOperationsMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      // Only collapse if not on an operations page
      if (!pathname.startsWith("/operations/")) {
        setIsOperationsExpanded(false)
      }
    }, 300)
  }

  const handleResetDemo = () => {
    if (confirm("Are you sure you want to reset all demo data? This cannot be undone.")) {
      dispatch({ type: "RESET_DATA" })
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-center">
              <Image src="/images/aeroiq-logo.png" alt="AeroIQ" width={120} height={32} className="h-6 w-auto" />
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                let badge = null

                // Add badges for metrics
                if (item.href === "/leads") {
                  const newLeads = state.leads.filter((lead) => lead.status === "new").length
                  if (newLeads > 0) {
                    badge = (
                      <Badge variant="secondary" className="ml-auto">
                        {newLeads}
                      </Badge>
                    )
                  }
                } else if (item.href === "/quotes") {
                  if (metrics.quotesPending > 0) {
                    badge = (
                      <Badge variant="secondary" className="ml-auto">
                        {metrics.quotesPending}
                      </Badge>
                    )
                  }
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {badge}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup
          onMouseEnter={handleOperationsMouseEnter}
          onMouseLeave={handleOperationsMouseLeave}
          className="relative"
        >
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Operations Header */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleOperationsClick}
                  className="flex items-center gap-3 cursor-pointer font-medium"
                >
                  <Plane className="h-4 w-4" />
                  <span>Operations</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 ml-auto transition-transform duration-200",
                      isOperationsExpanded && "rotate-180",
                    )}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Operations Submenu with smooth transition */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  isOperationsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                {operationsNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                  return (
                    <SidebarMenuItem key={item.href} className="pl-4">
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-2">
          <Button variant="outline" size="sm" onClick={handleResetDemo} className="w-full justify-start bg-transparent">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Demo Data
          </Button>
          <div className="text-xs text-sidebar-foreground/60 text-center">UI-only demo • Data stored locally</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
