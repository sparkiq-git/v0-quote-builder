"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Plus, User, Search, X } from "lucide-react"
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

interface SimpleContactComboboxProps {
  tenantId?: string
  value?: string | null
  selectedName?: string | null
  onSelect: (contact: Contact) => void
}

export function SimpleContactCombobox({ tenantId, value, selectedName, onSelect }: SimpleContactComboboxProps) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize supabase client
  useEffect(() => {
    if (typeof window === "undefined") return

    const initSupabase = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      setSupabase(createClient())
    }

    initSupabase()
  }, [])

  const effectiveTenantId = tenantId || process.env.NEXT_PUBLIC_TENANT_ID || process.env.TENANT_ID

  // Fetch contacts
  useEffect(() => {
    if (!open || !effectiveTenantId || !supabase) return

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from("contact")
        .select("*")
        .eq("tenant_id", effectiveTenantId)
        .ilike("full_name", `%${search}%`)
        .order("full_name", { ascending: true })
        .limit(25)

      if (error) {
        console.error("[v0] Error loading contacts:", error)
        toast({
          title: "Error loading contacts",
          description: error.message,
          variant: "destructive",
        })
      } else {
        console.log("[v0] Loaded contacts:", data?.length)
        setContacts(data || [])
      }
    }

    fetchContacts()
  }, [open, search, effectiveTenantId, supabase, toast])

  // Click outside to close
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setCreating(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        setCreating(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  const handleCreate = async (form: FormData) => {
    const full_name = form.get("full_name") as string
    const email = form.get("email") as string
    const phone = form.get("phone") as string
    const company = form.get("company") as string

    if (!full_name || !email || !phone) return
    if (!effectiveTenantId || !supabase) {
      toast({
        title: "Error",
        description: "Cannot create contact",
        variant: "destructive",
      })
      return
    }

    const { data, error } = await supabase
      .from("contact")
      .insert([{ tenant_id: effectiveTenantId, full_name, email, phone, company }])
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

  const position = triggerRef.current?.getBoundingClientRect()

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        className="justify-between w-full bg-transparent"
        onClick={() => {
          console.log("[v0] Contact combobox clicked, open:", !open)
          setOpen(!open)
        }}
        type="button"
      >
        {selectedName || "Select contact"}
        <User className="ml-2 h-4 w-4 opacity-50" />
      </Button>

      {mounted &&
        open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 w-[350px] rounded-md border bg-popover p-0 text-popover-foreground shadow-md"
            style={{
              top: position.bottom + 4,
              left: position.left,
            }}
          >
            {!creating ? (
              <div className="flex flex-col">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
                  {contacts.length === 0 ? (
                    <div className="flex flex-col items-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No contacts found</p>
                      <Button variant="outline" size="sm" onClick={() => setCreating(true)} className="text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Create new contact
                      </Button>
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <button
                        key={c.id}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          console.log("[v0] Contact selected:", c.full_name)
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
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <form
                className="p-4 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate(new FormData(e.currentTarget))
                }}
              >
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
          </div>,
          document.body,
        )}
    </>
  )
}
