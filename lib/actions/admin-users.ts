"use server"

import { createClient } from "@supabase/supabase-js"
import type { AdminUser, ShiftRotation } from "@/lib/types/admin"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getUsers(page = 1, limit = 50, search = "", roleFilter = "", crewFilter = "") {
  try {
    const supabase = getAdminClient()

    // Get users from auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    })

    if (authError) throw authError

    let users: AdminUser[] = authData.users.map((user) => ({
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.display_name || user.user_metadata?.full_name,
      phone_number: user.user_metadata?.phone_number,
      roles: Array.isArray(user.app_metadata?.roles)
        ? user.app_metadata.roles
        : user.app_metadata?.role
          ? [user.app_metadata.role]
          : [],
      status: user.banned_at ? "disabled" : "active",
      is_crew: user.app_metadata?.is_crew || false,
      avatar_path: user.user_metadata?.avatar_path,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      crew: null,
    }))

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      users = users.filter(
        (u) => u.email.toLowerCase().includes(searchLower) || u.display_name?.toLowerCase().includes(searchLower),
      )
    }

    if (roleFilter) {
      users = users.filter((u) => u.roles.includes(roleFilter))
    }

    if (crewFilter === "crew") {
      users = users.filter((u) => u.is_crew)
    } else if (crewFilter === "non-crew") {
      users = users.filter((u) => !u.is_crew)
    }

    return { success: true, data: users }
  } catch (error) {
    console.error("Get users error:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

export async function createUser(formData: FormData) {
  try {
    const supabase = getAdminClient()

    const email = formData.get("email") as string
    const displayName = formData.get("display_name") as string
    const phone = formData.get("phone") as string
    const role = formData.get("role") as string
    const isCrew = formData.get("is_crew") === "true"
    const crewDataStr = formData.get("crew_data") as string
    const crewData = crewDataStr && crewDataStr !== "null" ? JSON.parse(crewDataStr) : null

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split("@")[0],
        phone_number: phone,
      },
      app_metadata: {
        role,
        roles: [role],
        is_crew: isCrew,
        tenant_id: process.env.NEXT_PUBLIC_TENANT_ID,
      },
    })

    if (authError) throw authError

    // Handle avatar upload if provided
    const avatarData = formData.get("avatar_data") as string
    if (avatarData && authData.user) {
      const avatarName = formData.get("avatar_name") as string
      const avatarType = formData.get("avatar_type") as string

      const buffer = Uint8Array.from(atob(avatarData), (c) => c.charCodeAt(0))
      const fileName = `${authData.user.id}/${Date.now()}-${avatarName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, buffer, {
        contentType: avatarType,
        upsert: true,
      })

      if (!uploadError) {
        await supabase.auth.admin.updateUserById(authData.user.id, {
          user_metadata: {
            ...authData.user.user_metadata,
            avatar_path: fileName,
          },
        })
      }
    }

    // Create crew profile if needed
    if (isCrew && crewData && authData.user) {
      const { error: crewError } = await supabase.from("crew").insert({
        user_id: authData.user.id,
        first_name: crewData.first_name,
        last_name: crewData.last_name,
        display_name: crewData.display_name,
        phone_number: crewData.phone_number,
        home_base: crewData.home_base,
        international: crewData.international || false,
        shift_rotation_id: crewData.shift_rotation_id || null,
        active: crewData.active !== false,
      })

      if (crewError) console.error("Crew profile creation error:", crewError)
    }

    // Send invite email
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email)
    if (inviteError) console.error("Invite email error:", inviteError)

    return { success: true, data: authData.user }
  } catch (error) {
    console.error("Create user error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" }
  }
}

export async function updateUser(userId: string, data: any) {
  try {
    const supabase = getAdminClient()

    // Update auth user
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        display_name: data.display_name,
        phone_number: data.phone_number,
      },
      app_metadata: {
        roles: data.roles || [data.role],
        role: data.role || data.roles?.[0],
        is_crew: data.is_crew,
      },
      ban_duration: data.active ? "none" : "876000h", // 100 years if disabled
    })

    if (authError) throw authError

    // Update or create crew profile if needed
    if (data.is_crew && data.crew_data) {
      const { data: existingCrew } = await supabase.from("crew").select("id").eq("user_id", userId).single()

      if (existingCrew) {
        await supabase
          .from("crew")
          .update({
            first_name: data.crew_data.first_name,
            last_name: data.crew_data.last_name,
            display_name: data.crew_data.display_name,
            phone_number: data.crew_data.phone_number,
            home_base: data.crew_data.home_base,
            international: data.crew_data.international,
            shift_rotation_id: data.crew_data.shift_rotation_id || null,
            active: data.crew_data.active,
          })
          .eq("user_id", userId)
      } else {
        await supabase.from("crew").insert({
          user_id: userId,
          ...data.crew_data,
        })
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Update user error:", error)
    return { success: false, error: "Failed to update user" }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = getAdminClient()

    // Delete crew profile first if exists
    await supabase.from("crew").delete().eq("user_id", userId)

    // Delete user
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Delete user error:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function resendInvite(email: string) {
  try {
    const supabase = getAdminClient()
    const { error } = await supabase.auth.admin.inviteUserByEmail(email)
    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Resend invite error:", error)
    return { success: false, error: "Failed to resend invite" }
  }
}

export async function resetPassword(email: string) {
  try {
    const supabase = getAdminClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Reset password error:", error)
    return { success: false, error: "Failed to reset password" }
  }
}

export async function getShiftRotations() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("shift_rotations").select("*").order("name")

    if (error) throw error

    return { success: true, data: (data || []) as ShiftRotation[] }
  } catch (error) {
    console.error("Get shift rotations error:", error)
    return { success: false, data: [] }
  }
}
