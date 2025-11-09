"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SimpleSelect } from "@/components/ui/simple-select"
import { SimpleDropdownComposable, SimpleDropdownItem } from "@/components/ui/simple-dropdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CreateContactDialog } from "./create-contact-dialog"
import { EditContactDialog } from "./edit-contact-dialog"
import { Plus, Search, Edit, Trash2, Mail, Phone, MoreHorizontal } from "lucide-react"

interface Contact {
  id: string
  tenant_id: string
  full_name: string
  email: string
  phone: string | null
  company: string | null
  notes: string | null
  status: string
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export function ContactsListClient() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const { toast } = useToast()

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/contacts?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch contacts")

      const { data } = await response.json()
      setContacts(data || [])
    } catch (error: any) {
      console.error("Error fetching contacts:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load contacts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [searchQuery, statusFilter])

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Are you sure you want to delete ${contact.full_name}?`)) return

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete contact")

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      })
      fetchContacts()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge variant="default">Active</Badge>
    }
    return <Badge variant="secondary">Archived</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const filteredContacts = contacts.filter((contact) => {
    if (statusFilter !== "all" && contact.status !== statusFilter) return false
    return true
  })

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage your contacts and their information</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <SimpleSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={statusOptions}
              triggerClassName="w-[200px]"
            />
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading contacts...
                  </TableCell>
                </TableRow>
              ) : filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    {searchQuery || statusFilter !== "all"
                      ? "No contacts found matching your filters"
                      : "No contacts yet. Click 'Add Contact' to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={contact.avatar_path ? `/api/avatar/contact/${contact.id}` : undefined}
                            alt={contact.full_name}
                          />
                          <AvatarFallback>
                            {contact.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{contact.full_name}</div>
                          <div className="text-sm text-muted-foreground">{contact.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{contact.company || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contact.status)}</TableCell>
                    <TableCell>{formatDate(contact.created_at)}</TableCell>
                    <TableCell>
                      <SimpleDropdownComposable
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-neutral-900 hover:text-white transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        align="end"
                      >
                        <SimpleDropdownItem onClick={() => setEditingContact(contact)}>
                          <Edit className="h-4 w-4" />
                          Edit
                        </SimpleDropdownItem>
                        <SimpleDropdownItem onClick={() => handleDelete(contact)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </SimpleDropdownItem>
                      </SimpleDropdownComposable>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateContactDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchContacts} />
      {editingContact && (
        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open: boolean) => !open && setEditingContact(null)}
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null)
            fetchContacts()
          }}
        />
      )}
    </div>
  )
}
