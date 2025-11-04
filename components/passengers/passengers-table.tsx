"use client"

import { useState } from "react"
import { useMockStore } from "@/lib/mock/store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Search, Eye, UserCircle, Mail, Phone, Plane } from "lucide-react"
import { PassengerEditDialog } from "./passenger-edit-dialog"
import { PassengerHistoryDialog } from "./passenger-history-dialog"
import type { Passenger } from "@/lib/types"

export function PassengersTable() {
  const { state, dispatch } = useMockStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null)
  const [viewingPassenger, setViewingPassenger] = useState<Passenger | null>(null)

  const passengers = state.passengers || []

  const filteredPassengers = passengers.filter((passenger) => {
    const query = searchQuery.toLowerCase()
    return (
      passenger.name.toLowerCase().includes(query) ||
      passenger.email.toLowerCase().includes(query) ||
      passenger.phone.toLowerCase().includes(query) ||
      passenger.company?.toLowerCase().includes(query)
    )
  })

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this passenger?")) {
      dispatch({ type: "DELETE_PASSENGER", payload: id })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Quotes</TableHead>
              <TableHead>Flights</TableHead>
              <TableHead>Co-Passengers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPassengers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No passengers found
                </TableCell>
              </TableRow>
            ) : (
              filteredPassengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{passenger.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{passenger.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{passenger.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{passenger.company || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{passenger.quotesReceived.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Plane className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{passenger.flightsCompleted}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{passenger.pastCoPassengers.length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewingPassenger(passenger)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingPassenger(passenger)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(passenger.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingPassenger && (
        <PassengerEditDialog
          passenger={editingPassenger}
          open={!!editingPassenger}
          onOpenChange={(open) => !open && setEditingPassenger(null)}
        />
      )}

      {viewingPassenger && (
        <PassengerHistoryDialog
          passenger={viewingPassenger}
          open={!!viewingPassenger}
          onOpenChange={(open) => !open && setViewingPassenger(null)}
        />
      )}
    </div>
  )
}
