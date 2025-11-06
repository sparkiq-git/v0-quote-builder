"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
    const root = document.getElementById("portal-root") || document.body
    setPortalRoot(root)
    console.log("[v0] SimpleContactCombobox mounted, portal target:", root.id || "body")
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

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const dropdownHeight = 400 // estimated max height

      // Calculate position, ensuring it stays within viewport
      let top = rect.bottom + 4
      let left = rect.left

      // If dropdown would go off bottom of screen, show above button instead
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4
      }

      // If dropdown would go off right of screen, align to right edge
      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 8
      }

      const newPosition = {
        top: Math.max(4, top), // At least 4px from top
        left: Math.max(4, left), // At least 4px from left
        width: rect.width,
      }

      console.log(
        "[v0] Position calculated:",
        newPosition,
        "viewport:",
        { viewportHeight, viewportWidth },
        "rect:",
        rect,
      )
      setPosition(newPosition)
    } else {
      setPosition(null)
    }
  }, [open])

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

  console.log(
    "[v0] Render - mounted:",
    mounted,
    "open:",
    open,
    "position:",
    position,
    "triggerRef:",
    !!triggerRef.current,
    "portalRoot:",
    portalRoot?.id || "none",
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-9 px-4 py-2 justify-between w-full bg-transparent"
        onClick={() => {
          const newOpen = !open
          console.log("[v0] Contact combobox clicked, open:", newOpen)
          setOpen(newOpen)
        }}
      >
        {selectedName || "Select contact"}
        <User className="ml-2 h-4 w-4 opacity-50" />
      </button>

      {mounted &&
        open &&
        position &&
        portalRoot &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              zIndex: 2147483647,
              border: "10px solid red",
              background: "yellow",
              boxShadow: "0 0 100px 50px rgba(255, 0, 0, 1)",
              outline: "10px solid blue",
              pointerEvents: "auto",
            }}
            className="rounded-md p-4"
          >
            <div
              style={{
                background: "white",
                padding: "20px",
                border: "5px solid green",
                fontSize: "20px",
                fontWeight: "bold",
                color: "red",
                textAlign: "center",
              }}
            >
              <div style={{ background: "yellow", padding: "10px", marginBottom: "10px" }}>
                🚨 DROPDOWN IS RENDERING 🚨
              </div>
              <div>
                Position: top={position.top}px, left={position.left}px
              </div>
              <div>Z-index: 2147483647 (MAX)</div>
              <div>Contacts: {contacts.length}</div>
              <div>Portal: {portalRoot.id || "body"}</div>
            </div>

            {!creating ? (
              <div className="flex flex-col bg-white">
                <div className="flex items-center border-b px-3 bg-white">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    className="flex h-10 w-full rounded-md bg-white py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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

                <div className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1 bg-white">
                  {contacts.length === 0 ? (
                    <div className="flex flex-col items-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">No contacts found</p>
                      <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-2 rounded-md text-xs px-3 py-1.5 border shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Create new contact
                      </button>
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
                className="p-4 space-y-2 bg-white"
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
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="inline-flex items-center gap-2 rounded-md text-sm px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md text-sm px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}
          </div>,
          portalRoot,
        )}
    </>
  )
}
