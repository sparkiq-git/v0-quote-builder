"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { createUser } from "@/lib/actions/admin-users"
import { AVAILABLE_ROLES } from "@/lib/types/admin"
import { UserPlus, User, Phone, Upload, X, Mail, Shield } from "lucide-react"

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  email: string
  displayName: string
  phoneNumber: string
  role: string
}

export function CreateUserModalClean({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    email: "",
    displayName: "",
    phoneNumber: "",
    role: "crew",
  })

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

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

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.role) {
      toast({
        title: "Error",
        description: "Email and role are required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const submitData = new FormData()
      submitData.append("email", formData.email)
      submitData.append("display_name", formData.displayName || formData.email.split("@")[0])
      submitData.append("phone", formData.phoneNumber)
      submitData.append("role", formData.role)
      submitData.append("is_crew", "false") // Simplified - no crew logic
      submitData.append("crew_data", "null")

      // Handle avatar
      if (avatarFile) {
        const buffer = await avatarFile.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        submitData.append("avatar_data", base64)
        submitData.append("avatar_name", avatarFile.name)
        submitData.append("avatar_type", avatarFile.type)
      }

      const result = await createUser(submitData)

      if (result.success) {
        toast({
          title: "Success",
          description: `User created successfully! Invite sent to ${formData.email}`,
        })
        onSuccess()
        onOpenChange(false)
        resetForm()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      displayName: "",
      phoneNumber: "",
      role: "crew",
    })
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Create New User
          </DialogTitle>
          <DialogDescription className="text-base">
            Create a new user account and send them an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                User Information
              </CardTitle>
              <CardDescription>Basic account details and role assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email - Most Important Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-11 text-base"
                  required
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">Used for login and notifications</p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-base font-medium">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange("displayName", e.target.value)}
                  className="h-11 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Optional - will use email prefix if not provided
                </p>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-base font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="h-11 text-base"
                />
                <p className="text-sm text-muted-foreground">Optional contact number</p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role *
                </Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-base">
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{role}</span>
                          {role === "admin" && <span className="text-xs text-red-600">(Full Access)</span>}
                          {role === "manager" && <span className="text-xs text-orange-600">(Management)</span>}
                          {role === "crew" && <span className="text-xs text-blue-600">(Operations)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">Determines system access and permissions</p>
              </div>

              {/* Avatar Upload */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Profile Picture
                </Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("avatar-upload")?.click()}
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
                        <X className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload an image (max 2 MB). Supported: JPG, PNG, GIF, WebP.
                </p>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              <span>This will create a user account and send an invitation email</span>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-11 px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="h-11 px-8 bg-primary hover:bg-primary/90">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User & Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}