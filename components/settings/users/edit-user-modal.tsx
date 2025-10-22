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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { updateUser, getShiftRotations } from "@/lib/actions/admin-users"
import { userFormSchema } from "@/lib/validations/admin"
import { AVAILABLE_ROLES, type UserFormData, type AdminUser, type ShiftRotation } from "@/lib/types/admin"
import { Check, ChevronsUpDown, Upload, X, Users, Edit } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: AdminUser | null
}

export function EditUserModal({ open, onOpenChange, onSuccess, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [shiftRotations, setShiftRotations] = useState<ShiftRotation[]>([])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      roles: [],
      active: true,
      is_crew: false,
      crew_data: {
        first_name: "",
        last_name: "",
        display_name: "",
        phone_number: "",
        home_base: "",
        international: false,
        active: true,
      },
    },
  })

  const isCrew = form.watch("is_crew")
  const selectedRoles = form.watch("roles")

  // Load data when modal opens or user changes
  useEffect(() => {
    if (open && user) {
      loadShiftRotations()
      populateForm()
    }
  }, [open, user])

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

  const populateForm = () => {
    if (!user) return

    form.reset({
      email: user.email,
      roles: user.roles,
      active: user.status === "active",
      is_crew: user.is_crew,
      crew_data: user.crew
        ? {
            first_name: user.crew.first_name || "",
            last_name: user.crew.last_name || "",
            display_name: user.crew.display_name || "",
            phone_number: user.crew.phone_number || "",
            home_base: user.crew.home_base || "",
            international: user.crew.international,
            active: user.crew.active,
            shift_rotation_id: user.crew.shift_rotation_id || "",
          }
        : {
            first_name: "",
            last_name: "",
            display_name: user.display_name || "",
            phone_number: "",
            home_base: "",
            international: false,
            active: true,
          },
    })

    // Set avatar preview if user has one
    if (user.avatar_path) {
      setAvatarPreview(`/api/avatar/${user.id}`)
    } else {
      setAvatarPreview(null)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file
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

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Set form value
      form.setValue("avatar", file)
    }
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    form.setValue("avatar", undefined)
  }

  const toggleRole = (role: string) => {
    const currentRoles = form.getValues("roles")
    const newRoles = currentRoles.includes(role) ? currentRoles.filter((r) => r !== role) : [...currentRoles, role]
    form.setValue("roles", newRoles)
  }

  const onSubmit = async (data: UserFormData) => {
    if (!user) return

    setLoading(true)
    try {
      const result = await updateUser(user.id, data)
      if (result.success) {
        toast({
          title: "Success",
          description: `User ${data.email} updated successfully`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User: {user.email}
          </DialogTitle>
          <DialogDescription>Update user information and crew profile settings.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com" {...field} disabled />
                    </FormControl>
                    <FormDescription>Email cannot be changed after creation</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles</FormLabel>
                    <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !selectedRoles.length && "text-muted-foreground")}
                          >
                            {selectedRoles.length > 0 ? `${selectedRoles.length} role(s) selected` : "Select roles"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search roles..." />
                          <CommandList>
                            <CommandEmpty>No roles found.</CommandEmpty>
                            <CommandGroup>
                              {AVAILABLE_ROLES.map((role) => (
                                <CommandItem key={role} onSelect={() => toggleRole(role)}>
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedRoles.includes(role) ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {role.charAt(0).toUpperCase() + role.slice(1)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {selectedRoles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                          <button
                            type="button"
                            onClick={() => toggleRole(role)}
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active User</FormLabel>
                      <FormDescription>User can sign in and access the system</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Avatar Upload */}
              <div className="space-y-2">
                <FormLabel>Avatar</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback>
                      {user.display_name
                        ? user.display_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : user.email.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("avatar-upload-edit")?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarPreview ? "Change Image" : "Upload Image"}
                    </Button>
                    {avatarPreview && (
                      <Button type="button" variant="outline" size="sm" onClick={removeAvatar}>
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    id="avatar-upload-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload an image (max 2MB). Supported formats: JPG, PNG, GIF.
                </p>
              </div>

              {/* Is Crew Toggle */}
              <FormField
                control={form.control}
                name="is_crew"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Is Crew?
                      </FormLabel>
                      <FormDescription>
                        Enable to add crew-specific information and create a crew profile
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
            </div>

            {/* Crew Information - Only shown when is_crew is true */}
            {isCrew && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Crew Information
                  </CardTitle>
                  <CardDescription>Additional information required for crew members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="crew_data.first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
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
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John D." {...field} />
                        </FormControl>
                        <FormDescription>Name shown in schedules and crew assignments</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="crew_data.phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="crew_data.home_base"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Base</FormLabel>
                          <FormControl>
                            <Input placeholder="LAX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="crew_data.shift_rotation_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Rotation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shift rotation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {shiftRotations.map((rotation) => (
                              <SelectItem key={rotation.id} value={rotation.id}>
                                {rotation.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="crew_data.international"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">International</FormLabel>
                            <FormDescription className="text-xs">Can work international flights</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="crew_data.active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Active Crew</FormLabel>
                            <FormDescription className="text-xs">Available for scheduling</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
