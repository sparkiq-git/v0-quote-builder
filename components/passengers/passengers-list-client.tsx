"use client"

import { useState, useEffect } from "react"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SimpleSelect } from "@/components/ui/simple-select"
import { PassengersTable } from "@/components/passengers/passengers-table"
import { CreatePassengerDialog } from "@/components/passengers/create-passenger-dialog"

interface Passenger {
  id: string
  full_name: string
  email: string
  phone?: string
  company?: string
  contact_id: string
  avatar_path?: string
  status: "active" | "archived"
  created_at: string
  date_of_birth?: string
  passport_number?: string
  passport_expiry?: string
  nationality?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  weight?: number
  special_requests?: string
  dietary_restrictions?: string
  medical_conditions?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  preferred_seat?: string
  frequent_flyer_number?: string
}

export function PassengersListClient() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPassengers()
  }, [])

  useEffect(() => {
    filterPassengers()
  }, [passengers, searchQuery, statusFilter])

  const fetchPassengers = async () => {
    try {
      console.log("[v0] Fetching passengers from /api/passengers")
      const response = await fetch("/api/passengers")
      console.log("[v0] Passengers response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Passengers data received:", data)
        setPassengers(data)
      } else {
        const errorText = await response.text()
        console.error("[v0] Passengers fetch failed:", errorText)
      }
    } catch (error) {
      console.error("Failed to fetch passengers:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterPassengers = () => {
    let filtered = passengers

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((passenger) => passenger.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (passenger) =>
          passenger.full_name.toLowerCase().includes(query) ||
          passenger.email.toLowerCase().includes(query) ||
          passenger.company?.toLowerCase().includes(query) ||
          passenger.phone?.toLowerCase().includes(query),
      )
    }

    setFilteredPassengers(filtered)
  }

  const handlePassengerCreated = () => {
    fetchPassengers()
    setShowCreateDialog(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading passengers...</p>
      </div>
    )
  }

  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="w-full max-w-[1400px] space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Passengers</h1>
            <p className="text-muted-foreground">
              Manage passengers linked to contacts. A passenger is always linked to a contact.
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Passenger
          </Button>
        </div>

        {/* Filters Card */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Passenger Directory</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search passengers by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <SimpleSelect
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | "active" | "archived")}
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ]}
              className="w-[260px]"
            />
          </div>

          {/* Passengers Table */}
          <PassengersTable passengers={filteredPassengers} onUpdate={fetchPassengers} />
        </div>

        {/* Create Dialog */}
        <CreatePassengerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={handlePassengerCreated}
        />
      </div>
    </div>
  )
}
