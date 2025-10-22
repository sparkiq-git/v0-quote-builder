export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

import { Suspense } from "react"
import { getServerUser } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { UsersListClient } from "@/components/settings/users/users-list-client"
import { AppHeader } from "@/components/app-header"

export default async function UsersManagementPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Configuration Error</h1>
          <p className="text-muted-foreground max-w-md">
            The management system requires additional configuration. Please ensure the following environment variables
            are set:
          </p>
          <ul className="text-sm text-left space-y-1 bg-muted p-4 rounded-lg">
            <li>• NEXT_PUBLIC_SUPABASE_URL {supabaseUrl ? "✓" : "✗"}</li>
            <li>• SUPABASE_SERVICE_ROLE_KEY {serviceRoleKey ? "✓" : "✗"}</li>
          </ul>
        </div>
      </div>
    )
  }

  try {
    const { user } = await getServerUser()

    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
            <p className="text-muted-foreground">
              Unable to verify your authentication. Please try refreshing the page.
            </p>
          </div>
        </div>
      )
    }

    // Check for admin access
    const meta = (user.app_metadata ?? {}) as Record<string, any>
    const rolesArray: string[] = Array.isArray(meta.roles) ? meta.roles : []
    const singleRole: string | null = typeof meta.role === "string" ? meta.role : null
    const hasAdminAccess =
      rolesArray.includes("admin") ||
      rolesArray.includes("manager") ||
      singleRole === "admin" ||
      singleRole === "manager"

    if (!hasAdminAccess) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access the user management system.</p>
            <p className="text-sm text-muted-foreground">Contact your administrator if you believe this is an error.</p>
          </div>
        </div>
      )
    }

    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <Suspense fallback={<div>Loading users...</div>}>
              <UsersListClient />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  } catch (error) {
    console.error("Users management page error:", error)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Page</h1>
          <p className="text-muted-foreground">
            There was an error loading the user management page. Please try refreshing or contact support.
          </p>
        </div>
      </div>
    )
  }
}
