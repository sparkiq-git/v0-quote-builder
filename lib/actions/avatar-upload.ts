"use server"

import { createClient } from "@supabase/supabase-js"

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

export async function uploadAvatar(userId: string, file: File | Blob) {
  try {
    const adminClient = getAdminClient()

    // Get tenant ID from environment or use a default
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || "default"

    const fileType = (file as File).type || "image/jpeg"
    const fileName = (file as File).name || `${Date.now()}-${userId}.jpg`
    const fileExtension = fileName.split(".").pop() || "jpg"
    const finalName = `${Date.now()}-${userId}.${fileExtension}`
    const filePath = `tenant/${tenantId}/avatar/${userId}/${finalName}`

    console.log("[v0] Uploading avatar for user:", userId, "->", filePath)

    // ✅ Edge-safe upload (use Blob directly — no ArrayBuffer conversion)
    const blob = file instanceof Blob ? file : new Blob([file], { type: fileType })

    const { data, error } = await adminClient.storage
      .from("avatar")  // Changed from "avatars" to "avatar" (singular)
      .upload(filePath, blob, {
        contentType: fileType,
        upsert: true,
      })

    if (error) throw new Error(`Failed to upload avatar: ${error.message}`)

    // ✅ Update user metadata with avatar path
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        avatar_path: data.path,
      },
    })

    if (updateError) {
      console.warn("[v0] Metadata update failed, cleaning up uploaded file:", data.path)
      await adminClient.storage.from("avatar").remove([data.path])
      throw new Error(`Failed to update user metadata: ${updateError.message}`)
    }

    console.log("[v0] Avatar upload success:", data.path)
    return { success: true, path: data.path }
  } catch (error) {
    console.error("Upload avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload avatar",
    }
  }
}

export async function deleteAvatar(userId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: user, error: getUserError } = await adminClient.auth.admin.getUserById(userId)
    if (getUserError || !user.user) throw new Error("User not found")

    const avatarPath = user.user.user_metadata?.avatar_path
    if (avatarPath) {
      const { error: deleteError } = await adminClient.storage
        .from("avatar")
        .remove([avatarPath])
      if (deleteError) console.warn("Failed to delete avatar:", deleteError.message)
    }

    const currentMetadata = user.user.user_metadata || {}
    delete currentMetadata.avatar_path

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: currentMetadata,
    })
    if (updateError) throw new Error(`Failed to update user metadata: ${updateError.message}`)

    console.log("[v0] Avatar deleted successfully for user:", userId)
    return { success: true }
  } catch (error) {
    console.error("Delete avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete avatar",
    }
  }
}

export async function getAvatarUrl(userId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: user, error: getUserError } = await adminClient.auth.admin.getUserById(userId)
    if (getUserError || !user.user) throw new Error("User not found")

    const avatarPath = user.user.user_metadata?.avatar_path
    if (!avatarPath) return { success: true, url: null }

    const { data, error } = await adminClient.storage
      .from("avatar")
      .createSignedUrl(avatarPath, 3600)

    if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error("Get avatar URL error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get avatar URL",
    }
  }
}
