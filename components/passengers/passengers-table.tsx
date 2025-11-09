"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone, UserCircle, Building2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { SimpleDropdown } from "@/components/ui/simple-dropdown"
import { EditPassengerDialog } from "./edit-passenger-dialog"
import { PassengerHistoryDialog } from "./passenger-history-dialog"

interface Passenger {
  id: string
  full_name: string
  email: string
  phone?: string
  company?: string
  status: "active" | "archived"
  created_at: string
  contact_id: string
  avatar_path?: string
  // Additional fields from database
  date_of_birth?: string
  passport_number?: string
  passport_expiry?: string
  nationality?: string
  weight?: number
  special_requests?: string
  dietary_restrictions?: string
  medical_conditions?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_seat?: string
  frequent_flyer_number?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
}

interface PassengersTableProps {
  passengers: Passenger[]
  onUpdate: () => void
}

export function PassengersTable({ passengers, onUpdate }: PassengersTableProps) {
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null)
  const [viewingPassenger, setViewingPassenger] = useState<Passenger | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this passenger?")) return

    try {
      const response = await fetch(`/api/passengers/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onUpdate()
      } else {
        console.error("Failed to delete passenger")
      }
    } catch (error) {
      console.error("Error deleting passenger:", error)
    }
  }

  const handleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "archived" : "active"

    try {
      const response = await fetch(`/api/passengers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onUpdate()
      } else {
        console.error("Failed to update passenger status")
      }
    } catch (error) {
      console.error("Error updating passenger:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Linked Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passengers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No passengers found
                </TableCell>
              </TableRow>
            ) : (
              passengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={passenger.avatar_path ? `/api/avatar/passenger/${passenger.id}` : undefined}
                          alt={passenger.full_name}
                        />
                        <AvatarFallback>
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{passenger.full_name}</div>
                        <div className="text-sm text-muted-foreground">{passenger.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Contact ID</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {passenger.company ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{passenger.company}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{passenger.email}</span>
                      </div>
                      {passenger.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{passenger.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={passenger.status === "active" ? "default" : "secondary"}>
                      {passenger.status === "active" ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(passenger.created_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex justify-center">
                      <SimpleDropdown
                        trigger={<MoreHorizontal className="h-4 w-4" />}
                        items={[
                          {
                            label: "Edit",
                            icon: <Pencil className="h-4 w-4" />,
                            onClick: () => setEditingPassenger(passenger),
                          },
                          {
                            label: "Delete",
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => handleDelete(passenger.id),
                            variant: "destructive",
                          },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingPassenger && (
        <EditPassengerDialog
          passenger={editingPassenger}
          open={!!editingPassenger}
          onOpenChange={(open) => {
            if (!open) setEditingPassenger(null)
          }}
          onSuccess={() => {
            setEditingPassenger(null)
            onUpdate()
          }}
        />
      )}

      {viewingPassenger && (
        <PassengerHistoryDialog
          passenger={viewingPassenger}
          open={!!viewingPassenger}
          onOpenChange={(open) => {
            if (!open) setViewingPassenger(null)
          }}
        />
      )}
    </div>
  )
}
