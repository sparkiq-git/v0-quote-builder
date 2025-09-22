"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Users, FileText, Plane, RotateCcw, Settings } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"

const navigation = [
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
    title: "Aircraft",
    href: "/aircraft",
    icon: Plane,
  },
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

  const handleResetDemo = () => {
    if (confirm("Are you sure you want to reset all demo data? This cannot be undone.")) {
      dispatch({ type: "RESET_DATA" })
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">AeroIQ</span>
            <span className="text-xs text-sidebar-foreground/60">Brokers Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => {
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
