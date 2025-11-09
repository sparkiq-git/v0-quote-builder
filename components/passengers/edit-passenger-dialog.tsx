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
import { SimpleContactCombobox } from "@/components/ui/simple-contact-combobox"
import { Upload, X } from "lucide-react"
import { uploadPassengerAvatar, deletePassengerAvatar } from "@/lib/actions/passenger-avatar"

interface Passenger {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  contact_id: string
  notes?: string
  avatar_path?: string
  status: "active" | "archived"
}

interface Contact {
  id: string
  full_name: string
  email: string
  phone: string
  company?: string
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
    contact_id: passenger.contact_id || "",
    name: passenger.name,
    email: passenger.email,
    phone: passenger.phone || "",
    company: passenger.company || "",
    notes: passenger.notes || "",
    status: passenger.status,
  })

  const [selectedContactName, setSelectedContactName] = useState<string | null>(null)

  useEffect(() => {
    if (passenger.avatar_path && !removeExistingAvatar) {
      setAvatarPreview(`/api/avatar/passenger/${passenger.id}`)
    } else {
      setAvatarPreview(null)
    }
  }, [passenger, removeExistingAvatar])

  useEffect(() => {
    const fetchContactName = async () => {
      if (!formData.contact_id) {
        setSelectedContactName(null)
        return
      }

      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data, error } = await supabase
          .from("contact")
          .select("full_name")
          .eq("id", formData.contact_id)
          .single()

        if (!error && data) {
          setSelectedContactName(data.full_name)
        }
      } catch (error) {
        console.error("Error fetching contact:", error)
      }
    }

    fetchContactName()
  }, [formData.contact_id])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2 MB")
        return
      }

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
        contact_id: formData.contact_id || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        notes: formData.notes || null,
        status: formData.status,
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

  const handleContactSelect = (contact: Contact) => {
    setFormData({
      ...formData,
      contact_id: contact.id,
      name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company || "",
    })
    setSelectedContactName(contact.full_name)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Passenger</DialogTitle>
          <DialogDescription>Update passenger information and avatar</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview || "/placeholder.svg"}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
                  <img
                    src="/passenger-avatar.jpg"
                    alt="Placeholder"
                    className="h-20 w-20 rounded-lg object-cover opacity-50"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload-edit"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Avatar
                </Button>
                {(avatarPreview || passenger.avatar_path) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeAvatar}
                    className="gap-2 bg-transparent"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an image (max 2 MB). Supported: JPG, PNG, GIF, WebP.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-select">Contact *</Label>
            <SimpleContactCombobox
              value={formData.contact_id}
              selectedName={selectedContactName}
              onSelect={handleContactSelect}
            />
          </div>

          <div className="space-y-4">
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
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
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
