"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { createUser, getShiftRotations } from "@/lib/actions/admin-users"
import { userFormSchema } from "@/lib/validations/admin"
import { AVAILABLE_ROLES, type UserFormData, type ShiftRotation } from "@/lib/types/admin"
import { Upload, X, Users, UserPlus, User, Phone, MapPin, Globe, Clock, Copy, ArrowRight } from "lucide-react"

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [shiftRotations, setShiftRotations] = useState<ShiftRotation[]>([])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      display_name: "",
      phone_number: "",
      role: "crew",
      active: true,
      is_crew: false,
      crew_data: {
        first_name: "",
        last_name: "",
        display_name: "",
        phone_number: "",
        home_base: "",
        international: false,
        shift_rotation_id: "none",
        active: true,
      },
    },
  })

  const isCrew = form.watch("is_crew")
  const selectedRole = form.watch("role")
  const crewData = form.watch("crew_data")
  const email = form.watch("email")
  const phoneNumber = form.watch("phone_number")

  // Helper function to copy data from user fields to crew fields
  const copyUserDataToCrew = () => {
    const currentEmail = form.getValues("email")
    const currentDisplayName = form.getValues("display_name")
    const currentPhoneNumber = form.getValues("phone_number")

    // Extract name from email if display name is empty
    const emailName = currentEmail.split("@")[0]
    const nameParts = emailName.includes(".") ? emailName.split(".") : [emailName]

    form.setValue("crew_data.first_name", nameParts[0] || "")
    form.setValue("crew_data.last_name", nameParts[1] || "")
    form.setValue("crew_data.display_name", currentDisplayName || emailName)
    form.setValue("crew_data.phone_number", currentPhoneNumber || "")

    toast({
      title: "Data Copied",
      description: "User information has been copied to crew fields",
    })
  }

  // Auto-populate crew fields when toggling to crew
  useEffect(() => {
    if (isCrew) {
      const currentDisplayName = form.getValues("display_name")
      const currentPhoneNumber = form.getValues("phone_number")

      // Only auto-populate if crew fields are empty
      if (!crewData?.first_name && !crewData?.last_name) {
        const emailName = email.split("@")[0]
        const nameParts = emailName.includes(".") ? emailName.split(".") : [emailName]

        form.setValue("crew_data.first_name", nameParts[0] || "")
        form.setValue("crew_data.last_name", nameParts[1] || "")
        form.setValue("crew_data.display_name", currentDisplayName || emailName)
        form.setValue("crew_data.phone_number", currentPhoneNumber || "")
      }
    }
  }, [isCrew, email, form, crewData])

  /* -------------------- Load shift rotations -------------------- */
  useEffect(() => {
    if (open) loadShiftRotations()
  }, [open])

  const loadShiftRotations = async () => {
    try {
      const result = await getShiftRotations()
      if (result.success) setShiftRotations(result.data)
    } catch (error) {
      console.error("[v0] Failed to load shift rotations:", error)
    }
  }

  /* -------------------- Avatar handler -------------------- */
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
    form.setValue("avatar", file)
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    form.setValue("avatar", undefined)
    const fileInput = document.getElementById("avatar-upload") as HTMLInputElement
    if (fileInput) fileInput.value = ""
  }

  const displayName = isCrew && crewData?.display_name ? crewData.display_name : form.watch("display_name")
  const computedFullName =
    isCrew && crewData?.first_name && crewData?.last_name
      ? `${crewData.first_name} ${crewData.last_name}`.trim()
      : displayName || form.watch("email")?.split("@")[0] || ""

  /* -------------------- Submit logic -------------------- */
  const onSubmit = async (data: UserFormData) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", data.email)
      formData.append("display_name", data.display_name || "")
      formData.append("phone", data.phone_number || "") // ✅ changed: backend expects "phone"
      formData.append("role", data.role)
      formData.append("is_crew", String(data.is_crew))

      // Handle crew data with proper shift_rotation_id processing
      let processedCrewData = null
      if (data.is_crew && data.crew_data) {
        processedCrewData = {
          ...data.crew_data,
          shift_rotation_id: data.crew_data.shift_rotation_id === "none" ? null : data.crew_data.shift_rotation_id,
        }
      }
      formData.append("crew_data", data.is_crew ? JSON.stringify(processedCrewData) : "null")

      // ✅ safer avatar conversion
      if (data.avatar) {
        const buffer = await data.avatar.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        formData.append("avatar_data", base64)
        formData.append("avatar_name", data.avatar.name)
        formData.append("avatar_type", data.avatar.type)
      }

      const result = await createUser(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: `User created successfully! Invite sent to ${data.email}`,
        })
        onSuccess()
        onOpenChange(false)
        form.reset()
        setAvatarPreview(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("CreateUserModal submit error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  /* -------------------- Component JSX -------------------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] sm:!max-w-[80vw] md:!max-w-[80vw] lg:!max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-6 w-6 text-primary" />
            Create New User
          </DialogTitle>
          <DialogDescription className="text-base">
            Create a new user account with optional crew profile. All crew members will be automatically added to the
            crew roster.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Email Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@company.com" {...field} className="h-11 text-base" />
                          </FormControl>
                          <FormDescription>Used for login and notifications</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Display Name {!isCrew ? "*" : ""}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John Doe" 
                              {...field} 
                              className="h-11 text-base"
                              disabled={isCrew}
                            />
                          </FormControl>
                          <FormDescription>
                            {isCrew 
                              ? "Display name will be auto-generated from crew information" 
                              : "Name shown throughout the application"
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} className="h-11 text-base" />
                          </FormControl>
                          <FormDescription>Optional contact number for emergency notifications</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Role *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 text-base">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AVAILABLE_ROLES.map((role) => (
                                <SelectItem key={role} value={role} className="text-base">
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Determines system access and permissions</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Avatar upload */}
                    <div className="space-y-3">
                      <FormLabel className="text-base">Profile Picture</FormLabel>
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
                <Card
                  className={`border-2 transition-all duration-200 ${isCrew ? "border-blue-500 bg-blue-50/50" : "border-gray-200"}`}
                >
                  <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name="is_crew"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-1">
                            <FormLabel className="text-base flex items-center gap-2">
                              <Users className="h-5 w-5" /> Create Crew Profile
                            </FormLabel>
                            <FormDescription className="text-sm">
                              Enable to create a crew member with scheduling capabilities
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Crew Information */}
              <div className="space-y-6">
                {isCrew ? (
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
                          <Copy className="h-3 w-3 mr-1" />
                          Copy from User
                        </Button>
                      </CardTitle>
                      <CardDescription>Required details for crew scheduling and assignments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Names */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="crew_data.first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">First Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} className="h-11 text-base" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crew_data.last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base">Last Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} className="h-11 text-base" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="crew_data.display_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base">Display Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John D." {...field} className="h-11 text-base" />
                            </FormControl>
                            <FormDescription>Name shown in schedules and assignments</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="crew_data.phone_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Crew Phone
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} className="h-11 text-base" />
                            </FormControl>
                            <FormDescription>Separate contact for crew operations</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="crew_data.home_base"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Home Base
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Los Angeles, CA" {...field} className="h-11 text-base" />
                            </FormControl>
                            <FormDescription>Primary operating location</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="crew_data.shift_rotation_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Shift Rotation
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 text-base">
                                  <SelectValue placeholder="Select shift rotation" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No rotation assigned</SelectItem>
                                {shiftRotations.map((rotation) => (
                                  <SelectItem key={rotation.id} value={rotation.id} className="text-base">
                                    {rotation.name} ({rotation.days_on}/{rotation.days_off})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Default work schedule pattern</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="crew_data.international"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                <Globe className="h-4 w-4" /> International Crew
                              </FormLabel>
                              <FormDescription className="text-sm">
                                Enable for international flight operations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-green-600"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
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
                {isCrew ? (
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    This will create both a user account and crew profile
                  </span>
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
