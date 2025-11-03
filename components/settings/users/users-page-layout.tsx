"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { AppHeaderProvider } from "@/components/app-header-context"

interface UsersPageLayoutProps {
  children: React.ReactNode
}

export function UsersPageLayout({ children }: UsersPageLayoutProps) {
  return (
    <AppHeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AppHeaderProvider>
  )
}
