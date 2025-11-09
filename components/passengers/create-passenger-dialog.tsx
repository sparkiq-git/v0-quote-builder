"use client"

import type React from "react"

import { useState, useRef } from "react"
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
import { uploadPassengerAvatar } from "@/lib/actions/passenger-avatar"

interface CreatePassengerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreatePassengerDialog({ open, onOpenChange, onSuccess }: CreatePassengerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    date_of_birth: "",
    passport_number: "",
    passport_expiry: "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    weight: "",
    special_requests: "",
    dietary_restrictions: "",
    medical_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    preferred_seat: "",
    frequent_flyer_number: "",
    status: "active" as "active" | "archived",
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
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

      const response = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to create passenger")

      const newPassenger = await response.json()

      // Upload avatar if provided
      if (avatarFile && newPassenger.id) {
        const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || ""
        await uploadPassengerAvatar(newPassenger.id, avatarFile, tenantId)
      }

      onSuccess()
      resetForm()
    } catch (error) {
      console.error("Error creating passenger:", error)
      alert("Failed to create passenger")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      date_of_birth: "",
      passport_number: "",
      passport_expiry: "",
      nationality: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
      weight: "",
      special_requests: "",
      dietary_restrictions: "",
      medical_conditions: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      preferred_seat: "",
      frequent_flyer_number: "",
      status: "active",
    })
    removeAvatar()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Passenger</DialogTitle>
          <DialogDescription>Create a new passenger profile with their information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                id="avatar-upload"
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
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
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
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
                <Label htmlFor="passport_number">Passport Number</Label>
                <Input
                  id="passport_number"
                  value={formData.passport_number}
                  onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport_expiry">Passport Expiry</Label>
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
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequent_flyer_number">Frequent Flyer Number</Label>
                <Input
                  id="frequent_flyer_number"
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
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP/Postal Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
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
                <Label htmlFor="preferred_seat">Preferred Seat</Label>
                <Input
                  id="preferred_seat"
                  placeholder="e.g., Window, Aisle"
                  value={formData.preferred_seat}
                  onChange={(e) => setFormData({ ...formData, preferred_seat: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
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
                <Label htmlFor="special_requests">Special Requests</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Any special requests or preferences"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                <Textarea
                  id="dietary_restrictions"
                  value={formData.dietary_restrictions}
                  onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                  placeholder="Any dietary restrictions or preferences"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
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
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
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
              {loading ? "Creating..." : "Create Passenger"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
