"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { createUser, getShiftRotations } from "@/lib/actions/admin-users"
import { AVAILABLE_ROLES } from "@/lib/types/admin"
import { UserPlus, User, Users, Phone, MapPin, Globe, Clock, Upload, X } from "lucide-react"

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
  isCrew: boolean
  crewData: {
    firstName: string
    lastName: string
    displayName: string
    phoneNumber: string
    homeBase: string
    international: boolean
    shiftRotationId: string
    active: boolean
  }
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [shiftRotations, setShiftRotations] = useState<any[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    email: "",
    displayName: "",
    phoneNumber: "",
    role: "crew",
    isCrew: false,
    crewData: {
      firstName: "",
      lastName: "",
      displayName: "",
      phoneNumber: "",
      homeBase: "",
      international: false,
      shiftRotationId: "none",
      active: true,
    },
  })

  // Load shift rotations when modal opens
  React.useEffect(() => {
    if (open) {
      loadShiftRotations()
    }
  }, [open])

  const loadShiftRotations = async () => {
    try {
      const result = await getShiftRotations()
      if (result.success) {
        setShiftRotations(result.data)
      }
    } catch (error) {
      console.error("Failed to load shift rotations:", error)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith("crewData.")) {
      const crewField = field.replace("crewData.", "")
      setFormData(prev => ({
        ...prev,
        crewData: {
          ...prev.crewData,
          [crewField]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }))
    }
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

  const copyUserDataToCrew = () => {
    setFormData(prev => ({
      ...prev,
      crewData: {
        ...prev.crewData,
        firstName: prev.email.split("@")[0].split(".")[0] || "",
        lastName: prev.email.split("@")[0].split(".")[1] || "",
        displayName: prev.displayName || prev.email.split("@")[0],
        phoneNumber: prev.phoneNumber || "",
      },
    }))

    toast({
      title: "Data Copied",
      description: "User information has been copied to crew fields",
    })
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
      submitData.append("is_crew", String(formData.isCrew))

      // Handle crew data
      if (formData.isCrew) {
        const crewData = {
          ...formData.crewData,
          shift_rotation_id: formData.crewData.shiftRotationId === "none" ? null : formData.crewData.shiftRotationId,
        }
        submitData.append("crew_data", JSON.stringify(crewData))
      } else {
        submitData.append("crew_data", "null")
      }

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
      isCrew: false,
      crewData: {
        firstName: "",
        lastName: "",
        displayName: "",
        phoneNumber: "",
        homeBase: "",
        international: false,
        shiftRotationId: "none",
        active: true,
      },
    })
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] sm:!max-w-[80vw] md:!max-w-[80vw] lg:!max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Create New User
          </DialogTitle>
          <DialogDescription className="text-base">
            Create a new user account with optional crew profile. All crew members will be automatically added to the crew roster.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic User Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    User Account
                  </CardTitle>
                  <CardDescription>Basic authentication and role information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@company.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="h-11 text-base"
                      required
                    />
                    <p className="text-sm text-muted-foreground">Used for login and notifications</p>
                  </div>

                  {!formData.isCrew && (
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-base">Display Name *</Label>
                      <Input
                        id="displayName"
                        placeholder="John Doe"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange("displayName", e.target.value)}
                        className="h-11 text-base"
                        required={!formData.isCrew}
                      />
                      <p className="text-sm text-muted-foreground">Name shown throughout the application</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-base flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      className="h-11 text-base"
                    />
                    <p className="text-sm text-muted-foreground">Optional contact number for emergency notifications</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-base">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role} className="text-base">
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Determines system access and permissions</p>
                  </div>

                  {/* Avatar upload */}
                  <div className="space-y-3">
                    <Label className="text-base">Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400" />
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
                          <Upload className="h-4 w-4 mr-2" /> Upload Image
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

              {/* Crew Toggle Card */}
              <Card className={`border-2 transition-all duration-200 ${formData.isCrew ? "border-blue-500 bg-blue-50/50" : "border-gray-200"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base flex items-center gap-2">
                        <Users className="h-5 w-5" /> Create Crew Profile
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable to create a crew member with scheduling capabilities
                      </p>
                    </div>
                    <Switch
                      checked={formData.isCrew}
                      onCheckedChange={(checked) => handleInputChange("isCrew", checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Crew Information */}
            <div className="space-y-6">
              {formData.isCrew ? (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Crew Information
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyUserDataToCrew}
                        className="h-8 bg-transparent"
                      >
                        Copy from User
                      </Button>
                    </CardTitle>
                    <CardDescription>Required details for crew scheduling and assignments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="crewFirstName" className="text-base">First Name *</Label>
                        <Input
                          id="crewFirstName"
                          placeholder="John"
                          value={formData.crewData.firstName}
                          onChange={(e) => handleInputChange("crewData.firstName", e.target.value)}
                          className="h-11 text-base"
                          required={formData.isCrew}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crewLastName" className="text-base">Last Name *</Label>
                        <Input
                          id="crewLastName"
                          placeholder="Doe"
                          value={formData.crewData.lastName}
                          onChange={(e) => handleInputChange("crewData.lastName", e.target.value)}
                          className="h-11 text-base"
                          required={formData.isCrew}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="crewDisplayName" className="text-base">Display Name *</Label>
                      <Input
                        id="crewDisplayName"
                        placeholder="John D."
                        value={formData.crewData.displayName}
                        onChange={(e) => handleInputChange("crewData.displayName", e.target.value)}
                        className="h-11 text-base"
                        required={formData.isCrew}
                      />
                      <p className="text-sm text-muted-foreground">Name shown in schedules and assignments</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="crewPhoneNumber" className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Crew Phone
                      </Label>
                      <Input
                        id="crewPhoneNumber"
                        placeholder="+1 (555) 123-4567"
                        value={formData.crewData.phoneNumber}
                        onChange={(e) => handleInputChange("crewData.phoneNumber", e.target.value)}
                        className="h-11 text-base"
                      />
                      <p className="text-sm text-muted-foreground">Separate contact for crew operations</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="homeBase" className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Home Base
                      </Label>
                      <Input
                        id="homeBase"
                        placeholder="Los Angeles, CA"
                        value={formData.crewData.homeBase}
                        onChange={(e) => handleInputChange("crewData.homeBase", e.target.value)}
                        className="h-11 text-base"
                      />
                      <p className="text-sm text-muted-foreground">Primary operating location</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shiftRotation" className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Shift Rotation
                      </Label>
                      <Select 
                        value={formData.crewData.shiftRotationId} 
                        onValueChange={(value) => handleInputChange("crewData.shiftRotationId", value)}
                      >
                        <SelectTrigger className="h-11 text-base">
                          <SelectValue placeholder="Select shift rotation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No rotation assigned</SelectItem>
                          {shiftRotations.map((rotation) => (
                            <SelectItem key={rotation.id} value={rotation.id} className="text-base">
                              {rotation.name} ({rotation.days_on}/{rotation.days_off})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Default work schedule pattern</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4" /> International Crew
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Enable for international flight operations
                          </p>
                        </div>
                        <Switch
                          checked={formData.crewData.international}
                          onCheckedChange={(checked) => handleInputChange("crewData.international", checked)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" /> Active Crew
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Available for scheduling
                          </p>
                        </div>
                        <Switch
                          checked={formData.crewData.active}
                          onCheckedChange={(checked) => handleInputChange("crewData.active", checked)}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-200 bg-gray-50/30">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Crew Profile</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Toggle "Create Crew Profile" to enable crew scheduling and assignment features.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {formData.isCrew ? (
                <span>This will create both a user account and crew profile</span>
              ) : (
                <span>This will create a user account only</span>
              )}
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
