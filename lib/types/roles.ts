// Role management types
export interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface RoleFormData {
  name: string
  description?: string
  permissions: string[]
}

export const AVAILABLE_PERMISSIONS = [
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "quotes.view",
  "quotes.create",
  "quotes.edit",
  "quotes.delete",
  "aircraft.view",
  "aircraft.create",
  "aircraft.edit",
  "aircraft.delete",
  "settings.view",
  "settings.edit",
] as const

export type Permission = (typeof AVAILABLE_PERMISSIONS)[number]

export const SYSTEM_ROLES = ["admin", "manager", "dispatcher", "crew", "viewer"] as const
