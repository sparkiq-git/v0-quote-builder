"use server"

import { createClient } from "@supabase/supabase-js"
import type { AdminUser, ShiftRotation } from "@/lib/types/admin"
import { uploadAvatar } from "./avatar-upload"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getCurrentTenantId as getTenantId, isFatherTenant } from "@/lib/supabase/member-helpers"

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
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    const isFather = await isFatherTenant()
    
    // Check if user has a member record
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "You must be logged in to view users.", data: [] }
    }

    console.log("getUsers debug:", {
      userId: user.id,
      tenantId,
      isFather,
      hasAppMetadataTenantId: !!user.app_metadata?.tenant_id
    })

    // Check if user has a member record (use maybeSingle to avoid error if no record exists)
    const { data: currentUserMember, error: memberCheckError } = await supabase
      .from("member")
      .select("id, tenant_id, role")
      .eq("user_id", user.id)
      .maybeSingle()

    console.log("Member check result:", {
      hasMember: !!currentUserMember,
      memberError: memberCheckError ? {
        code: memberCheckError.code,
        message: memberCheckError.message
      } : null,
      memberData: currentUserMember
    })

    // If no member record exists and no tenant_id from app_metadata, user needs migration
    if (!currentUserMember && !tenantId) {
      return { 
        success: false, 
        error: "Your user account is not associated with a tenant. Please contact your administrator or run the member migration script (supabase/migrations/migrate_existing_users_to_member.sql).", 
        data: [] 
      }
    }
    
    if (!tenantId && !isFather) {
      return { 
        success: false, 
        error: "No tenant found. Please ensure you're logged in and have a member record.", 
        data: [] 
      }
    }

    // Build query for members - RLS will handle tenant filtering
    // Father tenant will see all members, others will see only their tenant
    let memberQuery = supabase
      .from("member")
      .select(`
        id,
        tenant_id,
        user_id,
        role,
        created_at,
        is_global_admin
      `)

    // Only filter by tenant_id if NOT father tenant (RLS will handle father tenant)
    if (!isFather && tenantId) {
      memberQuery = memberQuery.eq("tenant_id", tenantId)
    }

    // Apply role filter if provided
    if (roleFilter) {
      memberQuery = memberQuery.eq("role", roleFilter)
    }

    const { data: members, error: memberError } = await memberQuery.order("created_at", { ascending: false })

    if (memberError) {
      console.error("Error fetching members:", {
        code: memberError.code,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint,
        tenantId,
        isFather,
        userId: user?.id
      })
      // Provide more specific error message
      if (memberError.code === 'PGRST301' || memberError.message?.includes('permission denied') || memberError.code === '42501') {
        return { 
          success: false, 
          error: `Permission denied by RLS policy. Error: ${memberError.message}. Code: ${memberError.code}. Please check your RLS policies.`, 
          data: [] 
        }
      }
      return { success: false, error: `Failed to fetch members: ${memberError.message} (Code: ${memberError.code || 'unknown'})`, data: [] }
    }

    if (!members || members.length === 0) {
      console.log("No members found", { tenantId, isFather, userId: user?.id })
      return { success: true, data: [] }
    }

    // Get auth user data for these members using service role client
    let adminClient
    try {
      adminClient = getAdminClient()
    } catch (error) {
      console.error("Error creating admin client:", error)
      return { 
        success: false, 
        error: `Failed to initialize admin client: ${error instanceof Error ? error.message : 'Unknown error'}. Please check SUPABASE_SERVICE_ROLE_KEY environment variable.`, 
        data: [] 
      }
    }

    const userIds = members.map((m) => m.user_id)

    // Fetch auth users data
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError) {
      console.error("Error fetching auth users:", {
        code: authError.status,
        message: authError.message,
        userIds: userIds.length
      })
      return { success: false, error: `Failed to fetch user details: ${authError.message}`, data: [] }
    }

    // Map members to AdminUser format
    let users: AdminUser[] = members
      .map((member) => {
        const authUser = authData.users.find((u) => u.id === member.user_id)
        if (!authUser) return null

        return {
          id: authUser.id,
          email: authUser.email || "",
          display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name,
          phone_number: authUser.user_metadata?.phone_number,
          roles: [member.role], // Use role from member table
          status: authUser.banned_until ? "disabled" : "active",
          is_crew: authUser.app_metadata?.is_crew || false,
          avatar_path: authUser.user_metadata?.avatar_path,
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at,
          app_metadata: authUser.app_metadata,
          user_metadata: authUser.user_metadata,
          crew: null,
        }
      })
      .filter((u): u is AdminUser => u !== null)

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      users = users.filter(
        (u) => u.email.toLowerCase().includes(searchLower) || u.display_name?.toLowerCase().includes(searchLower),
      )
    }

    // Apply crew filter
    if (crewFilter === "crew") {
      users = users.filter((u) => u.is_crew)
    } else if (crewFilter === "non-crew") {
      users = users.filter((u) => !u.is_crew)
    }

    // Apply pagination
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedUsers = users.slice(start, end)

    // Fetch crew profiles for users who are crew
    const crewUserIds = paginatedUsers.filter((u) => u.is_crew).map((u) => u.id)
    if (crewUserIds.length > 0) {
      const { data: crewData } = await adminClient
        .from("crew")
        .select("*")
        .in("user_id", crewUserIds)

      if (crewData) {
        paginatedUsers.forEach((user) => {
          const crewProfile = crewData.find((c) => c.user_id === user.id)
          if (crewProfile) {
            user.crew = crewProfile as any
          }
        })
      }
    }

    return { success: true, data: paginatedUsers }
  } catch (error) {
    console.error("Get users error:", error)
    return { success: false, error: "Failed to fetch users", data: [] }
  }
}

export async function createUser(formData: FormData) {
  try {
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    if (!tenantId) {
      return { success: false, error: "No tenant found. Please ensure you're logged in." }
    }

    const adminClient = getAdminClient()
    const supabase = await createServerClient()

    const email = formData.get("email") as string
    const displayName = formData.get("display_name") as string
    const phone = formData.get("phone") as string
    const role = formData.get("role") as string
    const isCrew = formData.get("is_crew") === "true"
    const crewDataStr = formData.get("crew_data") as string
    const crewData = crewDataStr && crewDataStr !== "null" ? JSON.parse(crewDataStr) : null

    // Create user with Supabase Auth (requires service role)
    // Don't set email_confirm: true - let the invite email handle confirmation
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false, // Will be confirmed via invite email
      user_metadata: {
        display_name: displayName || email.split("@")[0],
        phone_number: phone,
      },
      app_metadata: {
        role,
        roles: [role],
        is_crew: isCrew,
        tenant_id: tenantId, // Use tenant_id from member table
      },
    })

    if (authError) {
      console.error("Create user auth error:", authError)
      if (authError.message.includes("email_exists") || authError.message.includes("already been registered")) {
        // Check if we have avatar file to upload for existing user
        const avatarFile = formData.get("avatar_file") as File
        if (avatarFile) {
          console.log("User exists but has avatar file - attempting to find user and update avatar")
          // Try to find the existing user and update their avatar
          const { data: existingUsers } = await adminClient.auth.admin.listUsers()
          const existingUser = existingUsers.users.find(u => u.email === email)
          
          if (existingUser) {
            const uploadResult = await uploadAvatar(existingUser.id, avatarFile)
            if (uploadResult.success) {
              console.log("Avatar updated for existing user:", uploadResult.path)
            } else {
              console.error("Failed to update avatar for existing user:", uploadResult.error)
            }
          }
        }
        return { success: false, error: "A user with this email address has already been registered" }
      }
      throw authError
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" }
    }

    // Create member record in member table (RLS will handle permissions)
    const { error: memberError } = await supabase.from("member").insert({
      tenant_id: tenantId,
      user_id: authData.user.id,
      role: role,
      is_global_admin: false,
    })

    if (memberError) {
      console.error("Error creating member record:", memberError)
      // Don't fail the entire operation, but log it
      // The user was created in auth, but member record failed
    }

    // Handle avatar upload if provided - using clean upload function
    const avatarFile = formData.get("avatar_file") as File
    if (avatarFile && authData.user) {
      console.log("Processing avatar upload for new user:", { 
        userId: authData.user.id, 
        email: authData.user.email 
      })
      
      const uploadResult = await uploadAvatar(authData.user.id, avatarFile)
      if (!uploadResult.success) {
        console.error("Avatar upload failed:", uploadResult.error)
      } else {
        console.log("Avatar uploaded successfully:", uploadResult.path)
      }
    } else {
      console.log("No avatar file provided or no user created")
    }

    // Create crew profile if needed
    if (isCrew && crewData && authData.user) {
      const { error: crewError } = await adminClient.from("crew").insert({
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

    // Send invite email via edge function
    try {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-user-invite`
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!anonKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - cannot send invite email")
      } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL - cannot send invite email")
      } else {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            email: email,
            user_id: authData.user.id,
            created_by: currentUser?.id || null,
            user_name: displayName || email.split("@")[0],
          }),
        })

        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) {
          console.error("Error sending invite email via edge function:", {
            status: res.status,
            error: json.error,
            email: email
          })
          // Don't fail the entire operation - user is created, just email failed
          // Admin can manually resend invite later
        } else {
          console.log("Invite email sent successfully to:", email)
        }
      }
    } catch (inviteErr: any) {
      console.error("Exception sending invite email:", inviteErr)
      // Don't fail the entire operation - user is created, just email failed
    }

    return { success: true, data: authData.user }
  } catch (error) {
    console.error("Create user error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to create user" }
  }
}

export async function updateUser(userId: string, data: any) {
  try {
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    if (!tenantId) {
      return { success: false, error: "No tenant found. Please ensure you're logged in." }
    }

    const adminClient = getAdminClient()
    const supabase = await createServerClient()

    // Update auth user (requires service role)
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
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

    // Update member record in member table (RLS will handle permissions)
    const roleToUpdate = data.role || data.roles?.[0]
    if (roleToUpdate) {
      const { error: memberError } = await supabase
        .from("member")
        .update({ role: roleToUpdate })
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)

      if (memberError) {
        console.error("Error updating member record:", memberError)
        // Don't fail the entire operation, but log it
      }
    }

    // Update or create crew profile if needed
    if (data.is_crew && data.crew_data) {
      const { data: existingCrew } = await adminClient.from("crew").select("id").eq("user_id", userId).single()

      if (existingCrew) {
        await adminClient
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
        await adminClient.from("crew").insert({
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
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    if (!tenantId) {
      return { success: false, error: "No tenant found. Please ensure you're logged in." }
    }

    const adminClient = getAdminClient()
    const supabase = await createServerClient()

    // Delete member record first (RLS will handle permissions)
    // The CASCADE constraint will handle this automatically, but we'll do it explicitly
    const { error: memberError } = await supabase
      .from("member")
      .delete()
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)

    if (memberError) {
      console.error("Error deleting member record:", memberError)
      // Continue with deletion even if member record deletion fails
    }

    // Delete crew profile if exists
    await adminClient.from("crew").delete().eq("user_id", userId)

    // Delete user from auth (requires service role)
    const { error } = await adminClient.auth.admin.deleteUser(userId)
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

export async function bulkUpdateUserRoles(userIds: string[], role: string, action: "add" | "remove") {
  try {
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    if (!tenantId) {
      return { success: false, error: "No tenant found. Please ensure you're logged in.", data: [] }
    }

    const adminClient = getAdminClient()
    const supabase = await createServerClient()
    const results = []

    for (const userId of userIds) {
      try {
        // Get current member record
        const { data: memberData, error: memberError } = await supabase
          .from("member")
          .select("role")
          .eq("user_id", userId)
          .eq("tenant_id", tenantId)
          .single()

        if (memberError || !memberData) {
          results.push({ userId, success: false, error: "Member record not found" })
          continue
        }

        // Since member table has a single role field, "add" sets the role, "remove" sets to default "user"
        const newRole = action === "add" ? role : "user"

        // Update member table (RLS will handle permissions)
        const { error: memberUpdateError } = await supabase
          .from("member")
          .update({ role: newRole })
          .eq("user_id", userId)
          .eq("tenant_id", tenantId)

        if (memberUpdateError) {
          results.push({ userId, success: false, error: memberUpdateError.message })
          continue
        }

        // Also update auth user app_metadata for backward compatibility
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
        if (userError) {
          results.push({ userId, success: false, error: userError.message })
          continue
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...userData.user.app_metadata,
            roles: [newRole],
            role: newRole,
          },
        })

        if (updateError) {
          results.push({ userId, success: false, error: updateError.message })
        } else {
          results.push({ userId, success: true })
        }
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return {
      success: failureCount === 0,
      data: results,
      summary: {
        total: userIds.length,
        success: successCount,
        failed: failureCount,
      },
    }
  } catch (error) {
    console.error("Bulk update user roles error:", error)
    return { success: false, error: "Failed to update user roles", data: [] }
  }
}

export async function getRoleStatistics() {
  try {
    // Get current tenant_id (RLS-safe)
    const tenantId = await getTenantId()
    const isFather = await isFatherTenant()
    
    if (!tenantId && !isFather) {
      return { success: false, error: "No tenant found. Please ensure you're logged in.", data: {} }
    }

    // Use regular client to query member table (respects RLS)
    // RLS policies will automatically allow father tenant to see all members
    const supabase = await createServerClient()
    
    let query = supabase
      .from("member")
      .select("role")
    
    // Only filter by tenant_id if NOT father tenant (RLS will handle father tenant)
    if (!isFather && tenantId) {
      query = query.eq("tenant_id", tenantId)
    }
    
    const { data: members, error: memberError } = await query

    if (memberError) {
      console.error("Error fetching members for statistics:", memberError)
      return { success: false, error: "Failed to get role statistics", data: {} }
    }

    // Calculate role statistics from member table
    const roleStats = {
      admin: 0,
      manager: 0,
      dispatcher: 0,
      crew: 0,
      viewer: 0,
    }

    members?.forEach((member) => {
      const role = member.role
      if (role in roleStats) {
        roleStats[role as keyof typeof roleStats]++
      }
    })

    return { success: true, data: roleStats }
  } catch (error) {
    console.error("Get role statistics error:", error)
    return { success: false, error: "Failed to get role statistics", data: {} }
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
