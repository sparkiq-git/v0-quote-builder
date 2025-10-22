// Admin user management types
export interface AdminUser {
  id: string
  email: string
  display_name?: string
  phone_number?: string
  roles: string[]
  status: "active" | "disabled"
  is_crew: boolean
  crew?: CrewProfile | null
  avatar_path?: string | null
  created_at: string
  last_sign_in_at?: string | null
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
}

export interface CrewProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  display_name: string
  phone_number?: string
  home_base?: string
  international: boolean
  shift_rotation_id?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ShiftRotation {
  id: string
  name: string
  days_on: number
  days_off: number
  description?: string
}

export interface UserFormData {
  email: string
  display_name?: string
  phone_number?: string
  role: string
  roles?: string[]
  active: boolean
  is_crew: boolean
  crew_data?: {
    first_name?: string
    last_name?: string
    display_name?: string
    phone_number?: string
    home_base?: string
    international?: boolean
    shift_rotation_id?: string
    active?: boolean
  }
  avatar?: File
}

export const AVAILABLE_ROLES = ["admin", "manager", "dispatcher", "crew", "viewer"] as const
export type UserRole = (typeof AVAILABLE_ROLES)[number]
