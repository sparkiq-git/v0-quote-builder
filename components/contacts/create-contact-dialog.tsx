"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { SimpleSelect } from "@/components/ui/simple-select"
import { useToast } from "@/hooks/use-toast"
import { uploadContactAvatar } from "@/lib/actions/contact-avatar"
import { Upload, X } from "lucide-react"

const contactFormSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "archived"]),
})

type ContactFormData = z.infer<typeof contactFormSchema>

interface CreateContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateContactDialog({ open, onOpenChange, onSuccess }: CreateContactDialogProps) {
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      status: "active",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      setAvatarFile(null)
      setAvatarPreview(null)
    }
  }, [open, form])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 2MB",
        variant: "destructive",
      })
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "File must be an image",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setAvatarFile(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    const fileInput = document.getElementById("avatar-upload-contact") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true)
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id

      if (!tenantId) {
        throw new Error("Missing tenant ID")
      }

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create contact")
      }

      const { data: contact } = await response.json()

      if (avatarFile && contact.id) {
        const uploadResult = await uploadContactAvatar(contact.id, avatarFile, tenantId)
        if (!uploadResult.success) {
          console.error("Avatar upload failed:", uploadResult.error)
          toast({
            title: "Contact created",
            description: "Contact was created but avatar upload failed",
            variant: "default",
          })
        }
      }

      toast({
        title: "Success",
        description: "Contact created successfully",
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
          <DialogDescription>Add a new contact to your directory</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="space-y-3">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-lg">
                  <Upload className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("avatar-upload-contact")?.click()}
                  className="h-10"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {avatarPreview ? "Change Image" : "Upload Image"}
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeAvatar}
                    className="h-10 bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Upload an image (max 2 MB). Supported: JPG, PNG, GIF, WebP.</p>
            <input
              id="avatar-upload-contact"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" placeholder="John Doe" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="john@example.com" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" {...form.register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" placeholder="Company Name" {...form.register("company")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SimpleSelect
              value={form.watch("status")}
              onValueChange={(value) => form.setValue("status", value as "active" | "archived")}
              options={statusOptions}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Additional notes..." {...form.register("notes")} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
