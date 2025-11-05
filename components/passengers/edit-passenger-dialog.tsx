"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useToast } from "@/hooks/use-toast"
import { uploadPassengerAvatar, deletePassengerAvatar } from "@/lib/actions/contact-avatar"
import { Upload, X, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

const passengerFormSchema = z.object({
  contact_id: z.string().min(1, "Contact is required"),
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "archived"]),
})

type PassengerFormData = z.infer<typeof passengerFormSchema>

interface Passenger {
  id: string
  contact_id: string
  full_name: string
  email: string
  phone: string | null
  company: string | null
  notes: string | null
  status: string
  avatar_path: string | null
  created_at: string
  updated_at: string
  contact?: {
    id: string
    full_name: string
    email: string
    company: string | null
  }
}

interface Contact {
  id: string
  full_name: string
  email: string
  company: string | null
}

interface EditPassengerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  passenger: Passenger
  onSuccess: () => void
}

export function EditPassengerDialog({ open, onOpenChange, passenger, onSuccess }: EditPassengerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [contactComboboxOpen, setContactComboboxOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const { toast } = useToast()

  const form = useForm<PassengerFormData>({
    resolver: zodResolver(passengerFormSchema),
    defaultValues: {
      contact_id: passenger.contact_id,
      full_name: passenger.full_name,
      email: passenger.email,
      phone: passenger.phone || "",
      company: passenger.company || "",
      notes: passenger.notes || "",
      status: passenger.status as "active" | "archived",
    },
  })

  useEffect(() => {
    if (open && passenger) {
      form.reset({
        contact_id: passenger.contact_id,
        full_name: passenger.full_name,
        email: passenger.email,
        phone: passenger.phone || "",
        company: passenger.company || "",
        notes: passenger.notes || "",
        status: passenger.status as "active" | "archived",
      })
      setAvatarPreview(null)
      setAvatarFile(null)
      setContactSearch("")
      setContactComboboxOpen(false)
    }
  }, [open, passenger, form])

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("/api/contacts?status=active")
        if (!response.ok) throw new Error("Failed to fetch contacts")
        const { data } = await response.json()
        setContacts(data || [])
      } catch (error: any) {
        console.error("Error fetching contacts:", error)
        toast({
          title: "Error",
          description: "Failed to load contacts",
          variant: "destructive",
        })
      } finally {
        setLoadingContacts(false)
      }
    }

    if (open) {
      fetchContacts()
    }
  }, [open, toast])

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact) => {
    if (!contactSearch) return true
    const search = contactSearch.toLowerCase()
    return (
      contact.full_name.toLowerCase().includes(search) ||
      contact.email.toLowerCase().includes(search) ||
      (contact.company && contact.company.toLowerCase().includes(search))
    )
  })

  const selectedContact = contacts.find((c) => c.id === form.watch("contact_id"))

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

  const removeAvatar = async () => {
    if (passenger.avatar_path) {
      const result = await deletePassengerAvatar(passenger.id)
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to delete avatar",
          variant: "destructive",
        })
        return
      }
    }
    setAvatarFile(null)
    setAvatarPreview(null)
    const fileInput = document.getElementById("avatar-upload-edit-passenger") as HTMLInputElement
    if (fileInput) fileInput.value = ""
    onSuccess() // Refresh to update avatar display
  }

  const onSubmit = async (data: PassengerFormData) => {
    setLoading(true)
    try {
      // Get tenant ID
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const tenantId = user?.app_metadata?.tenant_id

      if (!tenantId) {
        throw new Error("Missing tenant ID")
      }

      // Update passenger
      const response = await fetch(`/api/passengers/${passenger.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update passenger")
      }

      // Upload new avatar if provided
      if (avatarFile) {
        const uploadResult = await uploadPassengerAvatar(passenger.id, avatarFile, tenantId)
        if (!uploadResult.success) {
          console.error("Avatar upload failed:", uploadResult.error)
          toast({
            title: "Passenger updated",
            description: "Passenger was updated but avatar upload failed",
            variant: "default",
          })
        }
      }

      toast({
        title: "Success",
        description: "Passenger updated successfully",
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update passenger",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const currentAvatarUrl = passenger.avatar_path ? `/api/avatar/passenger/${passenger.id}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Passenger</DialogTitle>
          <DialogDescription>Update passenger information and avatar</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={avatarPreview || currentAvatarUrl || undefined}
                  alt={passenger.full_name}
                />
                <AvatarFallback>
                  {passenger.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <label htmlFor="avatar-upload-edit-passenger" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarPreview ? "Change Avatar" : "Upload Avatar"}
                    </span>
                  </Button>
                </label>
                <input
                  id="avatar-upload-edit-passenger"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                {(avatarPreview || currentAvatarUrl) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                    className="ml-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Upload an image (max 2 MB). Supported: JPG, PNG, GIF, WebP.
                </p>
              </div>
            </div>

            {/* Contact Selection - Searchable Combobox */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contact *</FormLabel>
                  <Popover open={contactComboboxOpen} onOpenChange={setContactComboboxOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={loadingContacts}
                        >
                          {selectedContact
                            ? `${selectedContact.full_name} ${selectedContact.email ? `(${selectedContact.email})` : ""}`
                            : loadingContacts
                            ? "Loading contacts..."
                            : "Select a contact"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search contacts by name, email, or company..."
                          value={contactSearch}
                          onValueChange={setContactSearch}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>
                            {contactSearch
                              ? `No contacts found matching "${contactSearch}"`
                              : "No contacts available"}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredContacts.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.id}
                                onSelect={() => {
                                  field.onChange(contact.id)
                                  setContactComboboxOpen(false)
                                  setContactSearch("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === contact.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{contact.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {contact.email}
                                    {contact.company && ` • ${contact.company}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
