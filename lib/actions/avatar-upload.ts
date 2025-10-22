"use server"

import { createClient } from "@supabase/supabase-js"

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function getAvatarUrl(userId: string) {
  try {
    const supabase = getAdminClient()

    // Get user's avatar path
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError) throw userError

    const avatarPath = userData.user.user_metadata?.avatar_path

    if (!avatarPath) {
      return { success: false, error: "No avatar found" }
    }

    // Get signed URL
    const { data: urlData, error: urlError } = await supabase.storage.from("avatars").createSignedUrl(avatarPath, 3600) // 1 hour expiry

    if (urlError) throw urlError

    return { success: true, url: urlData.signedUrl }
  } catch (error) {
    console.error("Get avatar URL error:", error)
    return { success: false, error: "Failed to get avatar URL" }
  }
}
