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
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Users,
  FileText,
  Plane,
  Settings,
  UserCog,
  Building2,
  UserCircle,
  ChevronDown,
  Users2,
  Contact,
  UserPlus,
  MapPin,
} from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { cn } from "@/lib/utils"
import { NavUser } from "@/components/nav-user"

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
  {
    title: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    title: "Itineraries",
    href: "/itineraries",
    icon: MapPin,
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
    title: "Contacts",
    href: "/operations/contacts",
    icon: Contact,
  },
  {
    title: "Passengers",
    href: "/operations/passengers",
    icon: UserPlus,
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
  {
    title: "Users",
    href: "/settings/users",
    icon: Users2,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state, dispatch, getMetrics } = useMockStore()
  const metrics = getMetrics()

  const [isOperationsExpanded, setIsOperationsExpanded] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [user, setUser] = useState<{
    name: string
    email: string
    avatar?: string
    role: string
    tenantId: string | null
  } | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      // Only run on client side
      if (typeof window === "undefined") return

      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        setUser({
          name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url,
          role: authUser.user_metadata?.role || "Member",
          tenantId: authUser.app_metadata?.tenant_id || null,
        })
      }
    }

    fetchUser()
  }, [])

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

  return (
    <Sidebar>
      <SidebarHeader className="border-sidebar-border">
        <div className="flex items-center gap-2 px-5 py-4">
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
                      <Link href={item.href} className="flex items-center gap-3 text-gray-500 hover:text-gray-900">
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
                  className="flex items-center gap-3 cursor-pointer font-medium text-gray-500 hover:text-gray-900"
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
                        <Link href={item.href} className="flex items-center gap-3 text-gray-500 hover:text-gray-900">
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
                      <Link href={item.href} className="flex items-center gap-3 text-gray-500 hover:text-gray-900">
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

      <SidebarFooter className="border-t border-sidebar-border">{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  )
}
