"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CreatePassengerDialog } from "./create-passenger-dialog"
import { EditPassengerDialog } from "./edit-passenger-dialog"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  Contact,
} from "lucide-react"

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

export function PassengersListClient() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null)
  const { toast } = useToast()

  const fetchPassengers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/passengers?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch passengers")

      const { data } = await response.json()
      setPassengers(data || [])
    } catch (error: any) {
      console.error("Error fetching passengers:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load passengers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPassengers()
  }, [searchQuery, statusFilter])

  const handleDelete = async (passenger: Passenger) => {
    if (!confirm(`Are you sure you want to delete ${passenger.full_name}?`)) return

    try {
      const response = await fetch(`/api/passengers/${passenger.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete passenger")

      toast({
        title: "Success",
        description: "Passenger deleted successfully",
      })
      fetchPassengers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete passenger",
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

  const filteredPassengers = passengers.filter((passenger) => {
    if (statusFilter !== "all" && passenger.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Passengers</h1>
          <p className="text-muted-foreground">
            Manage passengers linked to contacts. A passenger is always linked to a contact.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Passenger
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Passenger Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search passengers by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passenger</TableHead>
                <TableHead>Linked Contact</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading passengers...
                  </TableCell>
                </TableRow>
              ) : filteredPassengers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {searchQuery || statusFilter !== "all"
                      ? "No passengers found matching your filters"
                      : "No passengers yet. Click 'Add Passenger' to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPassengers.map((passenger) => (
                  <TableRow key={passenger.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={passenger.avatar_path ? `/api/avatar/passenger/${passenger.id}` : undefined}
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
                        <div>
                          <div className="font-medium">{passenger.full_name}</div>
                          <div className="text-sm text-muted-foreground">{passenger.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {passenger.contact ? (
                        <div className="flex items-center gap-2">
                          <Contact className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{passenger.contact.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{passenger.company || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {passenger.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{passenger.email}</span>
                          </div>
                        )}
                        {passenger.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{passenger.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(passenger.status)}</TableCell>
                    <TableCell>{formatDate(passenger.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingPassenger(passenger)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(passenger)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreatePassengerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchPassengers}
      />
      {editingPassenger && (
        <EditPassengerDialog
          open={!!editingPassenger}
          onOpenChange={(open: boolean) => !open && setEditingPassenger(null)}
          passenger={editingPassenger}
          onSuccess={() => {
            setEditingPassenger(null)
            fetchPassengers()
          }}
        />
      )}
    </div>
  )
}
