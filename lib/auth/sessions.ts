import { getServerUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export { getServerUser }

// Re-export for convenience and consistency with the spec
export async function getSessionData() {
  const { user, role, tenantId } = await getServerUser()

  if (!user || !tenantId) {
    return null
  }

  return {
    userId: user.id,
    tenantId,
    role,
    user,
  }
}

export async function requireAdmin() {
  const { user, role, tenantId } = await getServerUser()

  if (!user || !tenantId) {
    redirect("/login")
  }

  if (role !== "admin") {
    redirect("/unauthorized")
  }

  return { user, role, tenantId }
}
