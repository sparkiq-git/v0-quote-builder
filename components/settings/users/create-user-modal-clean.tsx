"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AVAILABLE_ROLES } from "@/lib/types/admin"
import { createUser } from "@/lib/actions/admin-users"
import { Shield, Upload, X, Mail, User, Phone } from "lucide-react"
import { ChevronDown, Check } from "lucide-react"
import { UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<FormData>({
    email: "",
    displayName: "",
    phoneNumber: "",
    role: "crew",
  })

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
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

    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setAvatarFile(file)
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

      // Handle avatar using the clean approach - send file directly
      if (avatarFile) {
        submitData.append("avatar_file", avatarFile)
        console.log("Avatar file prepared:", { name: avatarFile.name, type: avatarFile.type, size: avatarFile.size })
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
        // Handle specific error cases
        if (result.error?.includes("email_exists") || result.error?.includes("already been registered")) {
          toast({
            title: "User Already Exists",
            description: `A user with email ${formData.email} already exists. Please use a different email address.`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create user",
            variant: "destructive",
          })
        }
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

  const getRoleDisplay = (role: string) => {
    const displays: Record<string, { label: string; description: string; color: string }> = {
      admin: { label: "Admin", description: "(Full Access)", color: "text-red-500" },
      manager: { label: "Manager", description: "(Management)", color: "text-red-500" },
      dispatcher: { label: "Dispatcher", description: "", color: "" },
      crew: { label: "Crew", description: "(Operations)", color: "text-blue-500" },
      viewer: { label: "Viewer", description: "", color: "" },
    }
    return displays[role] || { label: role, description: "", color: "" }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Create New User
          </DialogTitle>
          <DialogDescription className="text-base">
            Create a new user account and send them an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
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
            <Label htmlFor="displayName" className="text-base font-medium">
              Display Name
            </Label>
            <Input
              id="displayName"
              placeholder="John Doe"
              value={formData.displayName}
              onChange={(e) => handleInputChange("displayName", e.target.value)}
              className="h-11 text-base"
            />
            <p className="text-sm text-muted-foreground">Optional - will use email prefix if not provided</p>
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
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span className="flex items-center gap-2">
                  {formData.role ? (
                    <>
                      <span>{getRoleDisplay(formData.role).label}</span>
                      {getRoleDisplay(formData.role).description && (
                        <span className={getRoleDisplay(formData.role).color}>
                          {getRoleDisplay(formData.role).description}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select a role</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full rounded-md border border-border bg-white shadow-lg">
                  {AVAILABLE_ROLES.map((role) => {
                    const display = getRoleDisplay(role)
                    const isSelected = formData.role === role
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          handleInputChange("role", role)
                          setIsRoleDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors first:rounded-t-md last:rounded-b-md ${
                          isSelected
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{display.label}</span>
                          {display.description && (
                            <span className={isSelected ? "text-primary-foreground/80" : display.color}>
                              {display.description}
                            </span>
                          )}
                        </span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
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
                  <img
                    src={avatarPreview || "/placeholder.svg"}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
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
            <p className="text-sm text-muted-foreground">Upload an image (max 2 MB). Supported: JPG, PNG, GIF, WebP.</p>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 pb-6 px-6 border-t">
          <div className="text-sm text-muted-foreground">
            <span>This will create a user account and send an invitation email</span>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={loading}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="h-11 px-8 bg-primary hover:bg-primary/90">
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
      </DialogContent>
    </Dialog>
  )
}
