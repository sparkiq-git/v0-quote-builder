"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SimpleSelect } from "@/components/ui/simple-select"
import { SimpleDateTimePicker } from "@/components/ui/simple-date-time-picker"
import { Camera, X } from "lucide-react"
import { uploadPassengerAvatar, deletePassengerAvatar } from "@/lib/actions/passenger-avatar"

interface Passenger {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  date_of_birth?: string
  passport_number?: string
  passport_expiry?: string
  nationality?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  weight?: number
  special_requests?: string
  dietary_restrictions?: string
  medical_conditions?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_seat?: string
  frequent_flyer_number?: string
  avatar_path?: string
  status: "active" | "archived"
}

interface EditPassengerDialogProps {
  passenger: Passenger
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditPassengerDialog({ passenger, open, onOpenChange, onSuccess }: EditPassengerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [removeExistingAvatar, setRemoveExistingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: passenger.name,
    email: passenger.email,
    phone: passenger.phone || "",
    company: passenger.company || "",
    date_of_birth: passenger.date_of_birth || "",
    passport_number: passenger.passport_number || "",
    passport_expiry: passenger.passport_expiry || "",
    nationality: passenger.nationality || "",
    address: passenger.address || "",
    city: passenger.city || "",
    state: passenger.state || "",
    zip_code: passenger.zip_code || "",
    country: passenger.country || "",
    weight: passenger.weight?.toString() || "",
    special_requests: passenger.special_requests || "",
    dietary_restrictions: passenger.dietary_restrictions || "",
    medical_conditions: passenger.medical_conditions || "",
    emergency_contact_name: passenger.emergency_contact_name || "",
    emergency_contact_phone: passenger.emergency_contact_phone || "",
    emergency_contact_relationship: passenger.emergency_contact_relationship || "",
    preferred_seat: passenger.preferred_seat || "",
    frequent_flyer_number: passenger.frequent_flyer_number || "",
    status: passenger.status,
  })

  useEffect(() => {
    if (passenger.avatar_path && !removeExistingAvatar) {
      setAvatarPreview(`/api/avatar/passenger/${passenger.id}`)
    } else {
      setAvatarPreview(null)
    }
  }, [passenger, removeExistingAvatar])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setRemoveExistingAvatar(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveExistingAvatar(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        weight: formData.weight ? Number(formData.weight) : null,
      }

      const response = await fetch(`/api/passengers/${passenger.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to update passenger")

      // Handle avatar changes
      if (removeExistingAvatar && passenger.avatar_path) {
        await deletePassengerAvatar(passenger.id)
      }

      if (avatarFile) {
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || ""
        await uploadPassengerAvatar(passenger.id, avatarFile, tenantId)
      }

      onSuccess()
    } catch (error) {
      console.error("Error updating passenger:", error)
      alert("Failed to update passenger")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto px-8">
        <DialogHeader>
          <DialogTitle>Edit Passenger</DialogTitle>
          <DialogDescription>Update passenger information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative">
                  <img
                    src={avatarPreview || "/placeholder.svg"}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload-edit"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF (max. 5MB)</p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date_of_birth">Date of Birth</Label>
                <SimpleDateTimePicker
                  date={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                  onDateChange={(d) => {
                    setFormData({ ...formData, date_of_birth: d ? d.toISOString().split("T")[0] : "" })
                  }}
                  showOnlyDate
                  placeholder="mm / dd / yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weight">Weight (lbs)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Travel Documents */}
          <div className="space-y-4">
            <h3 className="font-semibold">Travel Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-passport_number">Passport Number</Label>
                <Input
                  id="edit-passport_number"
                  value={formData.passport_number}
                  onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-passport_expiry">Passport Expiry</Label>
                <SimpleDateTimePicker
                  date={formData.passport_expiry ? new Date(formData.passport_expiry) : undefined}
                  onDateChange={(d) => {
                    setFormData({ ...formData, passport_expiry: d ? d.toISOString().split("T")[0] : "" })
                  }}
                  showOnlyDate
                  placeholder="mm / dd / yyyy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nationality">Nationality</Label>
                <Input
                  id="edit-nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-frequent_flyer_number">Frequent Flyer Number</Label>
                <Input
                  id="edit-frequent_flyer_number"
                  value={formData.frequent_flyer_number}
                  onChange={(e) => setFormData({ ...formData, frequent_flyer_number: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-semibold">Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-address">Street Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State/Province</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-zip_code">ZIP/Postal Code</Label>
                <Input
                  id="edit-zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preferences & Requirements */}
          <div className="space-y-4">
            <h3 className="font-semibold">Preferences & Requirements</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-preferred_seat">Preferred Seat</Label>
                <Input
                  id="edit-preferred_seat"
                  placeholder="e.g., Window, Aisle"
                  value={formData.preferred_seat}
                  onChange={(e) => setFormData({ ...formData, preferred_seat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <SimpleSelect
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "archived" })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-special_requests">Special Requests</Label>
                <Textarea
                  id="edit-special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Any special requests or preferences"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-dietary_restrictions">Dietary Restrictions</Label>
                <Textarea
                  id="edit-dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                  placeholder="Any dietary restrictions or preferences"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="edit-medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                  placeholder="Any medical conditions we should be aware of"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-emergency_contact_name">Contact Name</Label>
                <Input
                  id="edit-emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="edit-emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-emergency_contact_relationship">Relationship</Label>
                <Input
                  id="edit-emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
