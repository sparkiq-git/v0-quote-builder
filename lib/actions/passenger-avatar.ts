"use server"

import { createClient } from "@/lib/supabase/server"
import { put, del } from "@vercel/blob"

export async function uploadPassengerAvatar(passengerId: string, file: File, tenantId: string) {
  try {
    const supabase = await createClient()

    // Check if passenger exists and belongs to tenant
    const { data: passenger, error: fetchError } = await supabase
      .from("contact_passenger")
      .select("id, avatar_path")
      .eq("id", passengerId)
      .eq("tenant_id", tenantId)
      .single()

    if (fetchError || !passenger) {
      return { success: false, error: "Passenger not found" }
    }

    // Delete old avatar if exists
    if (passenger.avatar_path) {
      try {
        await del(passenger.avatar_path)
      } catch (deleteError) {
        console.error("Error deleting old avatar:", deleteError)
      }
    }

    // Upload new avatar
    const blob = await put(`passengers/${tenantId}/${passengerId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    // Update passenger with new avatar path
    const { error: updateError } = await supabase
      .from("contact_passenger")
      .update({ avatar_path: blob.url })
      .eq("id", passengerId)
      .eq("tenant_id", tenantId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, url: blob.url }
  } catch (error: any) {
    console.error("Error uploading passenger avatar:", error)
    return { success: false, error: error.message }
  }
}

export async function deletePassengerAvatar(passengerId: string) {
  try {
    const supabase = await createClient()

    // Get passenger with avatar
    const { data: passenger, error: fetchError } = await supabase
      .from("contact_passenger")
      .select("id, avatar_path, tenant_id")
      .eq("id", passengerId)
      .single()

    if (fetchError || !passenger) {
      return { success: false, error: "Passenger not found" }
    }

    // Delete from blob storage
    if (passenger.avatar_path) {
      try {
        await del(passenger.avatar_path)
      } catch (deleteError) {
        console.error("Error deleting avatar from blob:", deleteError)
      }
    }

    // Update passenger to remove avatar path
    const { error: updateError } = await supabase
      .from("contact_passenger")
      .update({ avatar_path: null })
      .eq("id", passengerId)
      .eq("tenant_id", passenger.tenant_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting passenger avatar:", error)
    return { success: false, error: error.message }
  }
}
