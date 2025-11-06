"use client"

import { Bell, ChevronsUpDown, LogOut } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  SimpleDropdownComposable,
  SimpleDropdownItem,
  SimpleDropdownLabel,
  SimpleDropdownSeparator,
} from "@/components/ui/simple-dropdown"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"

interface UserData {
  name: string
  email: string
  avatar?: string
  role: string
  tenantId: string | null
}

interface NavUserProps {
  user: UserData
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()

  const handleSignOut = async () => {
    // Only run on client side
    if (typeof window === "undefined") return

    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/sign-in"
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SimpleDropdownComposable
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
          trigger={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="rounded-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          }
        >
          <SimpleDropdownLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="rounded-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </SimpleDropdownLabel>
          <SimpleDropdownSeparator />
          <SimpleDropdownItem>
            <Bell />
            Notifications
          </SimpleDropdownItem>
          <SimpleDropdownSeparator />
          <SimpleDropdownItem onSelect={handleSignOut}>
            <LogOut />
            Log out
          </SimpleDropdownItem>
        </SimpleDropdownComposable>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
