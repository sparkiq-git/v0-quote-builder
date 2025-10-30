"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandList, CommandItem, CommandEmpty, CommandInput } from "@/components/ui/command"
import { Plus, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
interface Contact {
  id: string
  full_name: string
  email: string
  phone: string
  company?: string
}

interface ContactComboboxProps {
  value?: string | null
  selectedName?: string | null // ✅ NEW: parent passes current name
  onSelect: (contact: Contact) => void
}

export function ContactCombobox({ value, selectedName, onSelect }: ContactComboboxProps) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const { toast } = useToast()

  // Initialize supabase client on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initSupabase = async () => {
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs");
      setSupabase(createClientComponentClient());
    };
    
    initSupabase();
  }, []);

  // 🔹 Read tenant_id from environment variable
  const tenantId =
    process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID

  useEffect(() => {
    if (!tenantId) {
      console.warn("⚠️ TENANT_ID environment variable is missing — contact list will not load.")
    }
  }, [tenantId])

  // 🔹 Fetch contacts when dropdown opens or search changes
  useEffect(() => {
    if (!open || !tenantId || !supabase) return

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from("contact")
        .select("*")
        .eq("tenant_id", tenantId)
        .ilike("full_name", `%${search}%`)
        .order("full_name", { ascending: true })
        .limit(25)

      if (error) {
        console.error("Supabase contact fetch error:", JSON.stringify(error, null, 2))
        toast({
          title: "Error loading contacts",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        })
      } else {
        setContacts(data || [])
      }
    }

    fetchContacts()
  }, [open, search, tenantId, supabase])

  // 🔹 Handle creating a new contact inline
  const handleCreate = async (form: FormData) => {
    const full_name = form.get("full_name") as string
    const email = form.get("email") as string
    const phone = form.get("phone") as string
    const company = form.get("company") as string

    if (!full_name || !email || !phone) return
    if (!tenantId) {
      toast({
        title: "Missing tenant",
        description: "TENANT_ID environment variable is required to create contacts.",
        variant: "destructive",
      })
      return
    }
    if (!supabase) {
      toast({
        title: "Error",
        description: "Supabase client not initialized.",
        variant: "destructive",
      })
      return
    }

    const { data, error } = await supabase
      .from("contact")
      .insert([{ tenant_id: tenantId, full_name, email, phone, company }])
      .select()
      .single()

    if (error) {
      toast({
        title: "Error creating contact",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({ title: "Contact created", description: `${full_name} added.` })
      onSelect(data)
      setOpen(false)
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        {/* ✅ uses selectedName instead of searching in contacts[] */}
        <Button variant="outline" className="justify-between w-full">
          {selectedName || "Select contact"}
          <User className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[350px] p-0">
        {!creating ? (
          <Command>
            <CommandInput placeholder="Search contacts..." onValueChange={setSearch} />
            <CommandList className="pointer-events-auto max-h-[320px] overflow-y-auto overflow-x-hidden">
              <CommandEmpty>
                <div className="flex flex-col items-center py-6">
                  <p className="text-sm text-muted-foreground mb-2">No contacts found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreating(true)}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Create new contact
                  </Button>
                </div>
              </CommandEmpty>

              {contacts.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => {
                    onSelect(c)
                    setOpen(false)
                  }}
                >
                  <div>
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.company} • {c.email} • {c.phone}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        ) : (
          <form className="p-4 space-y-2" action={(formData) => handleCreate(formData)}>
            <div className="grid gap-1.5">
              <Label>Full Name *</Label>
              <Input name="full_name" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Email *</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone *</Label>
              <Input name="phone" required />
            </div>
            <div className="grid gap-1.5">
              <Label>Company</Label>
              <Input name="company" />
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Contact</Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
