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

export async function uploadContactAvatar(contactId: string, file: File | Blob, tenantId: string) {
  try {
    const adminClient = getAdminClient()

    const fileType = (file as File).type || "image/jpeg"
    const fileName = (file as File).name || `${Date.now()}-${contactId}.jpg`
    const fileExtension = fileName.split(".").pop() || "jpg"
    const finalName = `${Date.now()}-${contactId}.${fileExtension}`
    const filePath = `tenant/${tenantId}/contact-avatar/${contactId}/${finalName}`

    console.log("[v0] Uploading avatar for contact:", contactId, "->", filePath)

    const blob = file instanceof Blob ? file : new Blob([file], { type: fileType })

    const { data, error } = await adminClient.storage
      .from("avatar")
      .upload(filePath, blob, {
        contentType: fileType,
        upsert: true,
      })

    if (error) throw new Error(`Failed to upload avatar: ${error.message}`)

    // Update contact with avatar path
    const { error: updateError } = await adminClient
      .from("contact")
      .update({ avatar_path: data.path })
      .eq("id", contactId)

    if (updateError) {
      console.warn("[v0] Metadata update failed, cleaning up uploaded file:", data.path)
      await adminClient.storage.from("avatar").remove([data.path])
      throw new Error(`Failed to update contact avatar: ${updateError.message}`)
    }

    console.log("[v0] Contact avatar upload success:", data.path)
    return { success: true, path: data.path }
  } catch (error) {
    console.error("Upload contact avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload avatar",
    }
  }
}

export async function deleteContactAvatar(contactId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: contact, error: getError } = await adminClient
      .from("contact")
      .select("avatar_path")
      .eq("id", contactId)
      .single()

    if (getError || !contact) throw new Error("Contact not found")

    if (contact.avatar_path) {
      const { error: deleteError } = await adminClient.storage
        .from("avatar")
        .remove([contact.avatar_path])
      if (deleteError) console.warn("Failed to delete avatar:", deleteError.message)
    }

    const { error: updateError } = await adminClient
      .from("contact")
      .update({ avatar_path: null })
      .eq("id", contactId)

    if (updateError) throw new Error(`Failed to update contact: ${updateError.message}`)

    console.log("[v0] Contact avatar deleted successfully for contact:", contactId)
    return { success: true }
  } catch (error) {
    console.error("Delete contact avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete avatar",
    }
  }
}

export async function getContactAvatarUrl(contactId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: contact, error: getError } = await adminClient
      .from("contact")
      .select("avatar_path")
      .eq("id", contactId)
      .single()

    if (getError || !contact) throw new Error("Contact not found")

    const avatarPath = contact.avatar_path
    if (!avatarPath) return { success: true, url: null }

    const { data, error } = await adminClient.storage
      .from("avatar")
      .createSignedUrl(avatarPath, 3600)

    if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error("Get contact avatar URL error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get avatar URL",
    }
  }
}

export async function uploadPassengerAvatar(passengerId: string, file: File | Blob, tenantId: string) {
  try {
    const adminClient = getAdminClient()

    const fileType = (file as File).type || "image/jpeg"
    const fileName = (file as File).name || `${Date.now()}-${passengerId}.jpg`
    const fileExtension = fileName.split(".").pop() || "jpg"
    const finalName = `${Date.now()}-${passengerId}.${fileExtension}`
    const filePath = `tenant/${tenantId}/passenger-avatar/${passengerId}/${finalName}`

    console.log("[v0] Uploading avatar for passenger:", passengerId, "->", filePath)

    const blob = file instanceof Blob ? file : new Blob([file], { type: fileType })

    const { data, error } = await adminClient.storage
      .from("avatar")
      .upload(filePath, blob, {
        contentType: fileType,
        upsert: true,
      })

    if (error) throw new Error(`Failed to upload avatar: ${error.message}`)

    // Update passenger with avatar path
    const { error: updateError } = await adminClient
      .from("contact_passenger")
      .update({ avatar_path: data.path })
      .eq("id", passengerId)

    if (updateError) {
      console.warn("[v0] Metadata update failed, cleaning up uploaded file:", data.path)
      await adminClient.storage.from("avatar").remove([data.path])
      throw new Error(`Failed to update passenger avatar: ${updateError.message}`)
    }

    console.log("[v0] Passenger avatar upload success:", data.path)
    return { success: true, path: data.path }
  } catch (error) {
    console.error("Upload passenger avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload avatar",
    }
  }
}

export async function deletePassengerAvatar(passengerId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: passenger, error: getError } = await adminClient
      .from("contact_passenger")
      .select("avatar_path")
      .eq("id", passengerId)
      .single()

    if (getError || !passenger) throw new Error("Passenger not found")

    if (passenger.avatar_path) {
      const { error: deleteError } = await adminClient.storage
        .from("avatar")
        .remove([passenger.avatar_path])
      if (deleteError) console.warn("Failed to delete avatar:", deleteError.message)
    }

    const { error: updateError } = await adminClient
      .from("contact_passenger")
      .update({ avatar_path: null })
      .eq("id", passengerId)

    if (updateError) throw new Error(`Failed to update passenger: ${updateError.message}`)

    console.log("[v0] Passenger avatar deleted successfully for passenger:", passengerId)
    return { success: true }
  } catch (error) {
    console.error("Delete passenger avatar error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete avatar",
    }
  }
}

export async function getPassengerAvatarUrl(passengerId: string) {
  try {
    const adminClient = getAdminClient()

    const { data: passenger, error: getError } = await adminClient
      .from("contact_passenger")
      .select("avatar_path")
      .eq("id", passengerId)
      .single()

    if (getError || !passenger) throw new Error("Passenger not found")

    const avatarPath = passenger.avatar_path
    if (!avatarPath) return { success: true, url: null }

    const { data, error } = await adminClient.storage
      .from("avatar")
      .createSignedUrl(avatarPath, 3600)

    if (error) throw new Error(`Failed to generate signed URL: ${error.message}`)

    return { success: true, url: data.signedUrl }
  } catch (error) {
    console.error("Get passenger avatar URL error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get avatar URL",
    }
  }
}
