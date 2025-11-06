"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MapPin,
  Loader2,
  Save,
  Users,
  UserPlus,
  UserCog,
  Plus,
  Trash2,
  X,
  ChevronsUpDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Passenger {
  id: string
  contact_id: string
  full_name: string
  email: string
  phone: string | null
  company: string | null
  avatar_path: string | null
}

interface ItineraryCrewMember {
  id: string
  role: string
  full_name: string | null
  notes: string | null
  confirmed: boolean
}

interface Itinerary {
  id: string
  contact_id: string
  total_pax: number
  contact?: {
    id: string
    full_name: string
    email: string
  }
}

interface EditItineraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itinerary: Itinerary
  onSuccess?: () => void
}

export function EditItineraryDialog({
  open,
  onOpenChange,
  itinerary,
  onSuccess,
}: EditItineraryDialogProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Passengers state
  const [passengers, setPassengers] = useState<Array<{ id: string; passenger_id: string }>>([])
  const [availablePassengers, setAvailablePassengers] = useState<Passenger[]>([])
  const [loadingPassengers, setLoadingPassengers] = useState(true)
  const [passengerSearch, setPassengerSearch] = useState("")
  const [passengerComboboxOpen, setPassengerComboboxOpen] = useState<string | null>(null)
  const [showCreatePassengerForm, setShowCreatePassengerForm] = useState(false)
  const [creatingPassenger, setCreatingPassenger] = useState(false)
  const [newPassengerData, setNewPassengerData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
  })
  
  // Crew state - stored independently (no crew_id foreign key)
  const [crewMembers, setCrewMembers] = useState<Array<{ id: string; role: string; full_name?: string; notes?: string }>>([])

  const fetchItineraryData = async () => {
    try {
      const response = await fetch(`/api/itineraries/${itinerary.id}/passengers`)
      if (response.ok) {
        const { data } = await response.json()
        // Map passengers - the API returns itinerary_passenger records with nested passenger data
        const mappedPassengers = (data?.passengers || []).map((p: any) => ({
          id: p.id || `temp-${Date.now()}-${Math.random()}`,
          passenger_id: p.passenger_id,
        }))
        setPassengers(mappedPassengers)
        
        // Also add passengers from itinerary to availablePassengers if they're not already there
        // This ensures passengers already on the itinerary are visible even if they're not in the filtered list
        setAvailablePassengers((prev) => {
          const existingPassengerIds = new Set(prev.map((p) => p.id))
          
          // Extract passenger data from the nested structure
          const newPassengers = (data?.passengers || [])
            .filter((p: any) => p.passenger && !existingPassengerIds.has(p.passenger_id))
            .map((p: any) => ({
              ...p.passenger,
              // Ensure we have all required fields
              id: p.passenger_id,
              contact_id: p.passenger.contact_id || itinerary.contact_id,
            }))
          
          if (newPassengers.length > 0) {
            console.log("Adding passengers from itinerary to available list:", newPassengers)
            return [...prev, ...newPassengers]
          }
          
          return prev
        })
        
        console.log("Fetched itinerary passengers:", mappedPassengers)
      }
    } catch (error) {
      console.error("Error fetching itinerary passengers:", error)
    }

    try {
      const response = await fetch(`/api/itineraries/${itinerary.id}/crew`)
      if (response.ok) {
        const { data } = await response.json()
        // Map crew data to match our state structure
        const crewData = (data?.crew || []).map((c: any) => ({
          id: c.id,
          role: c.role,
          full_name: c.full_name || "",
          notes: c.notes || "",
        }))
        setCrewMembers(crewData)
      }
    } catch (error) {
      console.error("Error fetching itinerary crew:", error)
    }
  }

  const fetchAvailablePassengers = async () => {
    setLoadingPassengers(true)
    try {
      if (!itinerary.contact_id) {
        console.warn("No contact_id provided for itinerary")
        setAvailablePassengers([])
        setLoadingPassengers(false)
        return
      }
      
      // Fetch all passengers for this contact (not just active ones)
      // This ensures we can see passengers already on the itinerary
      const response = await fetch(`/api/passengers?contact_id=${itinerary.contact_id}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch passengers: ${response.status}`)
      }
      const { data } = await response.json()
      console.log("Fetched available passengers for contact:", itinerary.contact_id, data?.length || 0, "passengers")
      setAvailablePassengers(data || [])
    } catch (error: any) {
      console.error("Error fetching passengers:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load passengers",
        variant: "destructive",
      })
    } finally {
      setLoadingPassengers(false)
    }
  }


  // Fetch available passengers first (linked to the contact)
  useEffect(() => {
    if (open && itinerary.contact_id) {
      fetchAvailablePassengers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itinerary.contact_id])

  // Fetch existing passengers and crew for this itinerary
  useEffect(() => {
    if (open && itinerary.id) {
      fetchItineraryData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itinerary.id])


  const handleAddPassengerSlot = () => {
    if (passengers.length >= itinerary.total_pax) {
      toast({
        title: "Limit Reached",
        description: `Maximum ${itinerary.total_pax} passengers allowed for this itinerary.`,
        variant: "destructive",
      })
      return
    }
    setPassengers([...passengers, { id: `temp-${Date.now()}`, passenger_id: "" }])
  }

  const handleRemovePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index))
  }

  const handleSelectPassenger = (index: number, passengerId: string) => {
    const updated = [...passengers]
    updated[index].passenger_id = passengerId
    setPassengers(updated)
    setPassengerComboboxOpen(null)
  }

  const handleCreatePassenger = async () => {
    if (!newPassengerData.full_name || !newPassengerData.email) {
      toast({
        title: "Validation Error",
        description: "Full name and email are required",
        variant: "destructive",
      })
      return
    }

    setCreatingPassenger(true)
    try {
      const response = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: itinerary.contact_id,
          full_name: newPassengerData.full_name,
          email: newPassengerData.email,
          phone: newPassengerData.phone || undefined,
          company: newPassengerData.company || undefined,
          status: "active",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create passenger")
      }

      const { data: newPassenger } = await response.json()

      // Refresh available passengers
      await fetchAvailablePassengers()

      // Add the new passenger to the current passenger list if there's an empty slot
      const emptySlotIndex = passengers.findIndex((p) => !p.passenger_id)
      if (emptySlotIndex !== -1) {
        const updated = [...passengers]
        updated[emptySlotIndex].passenger_id = newPassenger.id
        setPassengers(updated)
      } else if (passengers.length < itinerary.total_pax) {
        // Add new passenger entry
        setPassengers([...passengers, { id: `temp-${Date.now()}`, passenger_id: newPassenger.id }])
      }

      // Reset form
      setNewPassengerData({ full_name: "", email: "", phone: "", company: "" })
      setShowCreatePassengerForm(false)

      toast({
        title: "Success",
        description: "Passenger created and added to itinerary",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create passenger",
        variant: "destructive",
      })
    } finally {
      setCreatingPassenger(false)
    }
  }

  const handleAddCrew = (role: "PIC" | "SIC" | "Cabin Attendance") => {
    setCrewMembers([...crewMembers, { id: `temp-${Date.now()}`, role, full_name: "", notes: "" }])
  }

  const handleRemoveCrew = (index: number) => {
    setCrewMembers(crewMembers.filter((_, i) => i !== index))
  }

  const handleUpdateCrewNotes = (index: number, notes: string) => {
    const updated = [...crewMembers]
    updated[index].notes = notes
    setCrewMembers(updated)
  }

  const handleUpdateCrewName = (index: number, full_name: string) => {
    const updated = [...crewMembers]
    updated[index].full_name = full_name
    setCrewMembers(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Validate passengers don't exceed total_pax
      if (passengers.length > itinerary.total_pax) {
        throw new Error(`Cannot exceed ${itinerary.total_pax} passengers`)
      }

      // Validate all passengers are selected
      const incompletePassengers = passengers.filter((p) => !p.passenger_id)
      if (incompletePassengers.length > 0) {
        throw new Error("Please select a passenger for all entries")
      }

      // Validate all crew have role
      const incompleteCrew = crewMembers.filter((c) => !c.role)
      if (incompleteCrew.length > 0) {
        throw new Error("Please enter a role for all crew members")
      }

      // Save passengers
      const passengerResponse = await fetch(`/api/itineraries/${itinerary.id}/passengers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengers: passengers.map((p) => ({ passenger_id: p.passenger_id })),
        }),
      })

      if (!passengerResponse.ok) {
        const error = await passengerResponse.json()
        throw new Error(error.error || "Failed to save passengers")
      }

      // Save crew
      const crewResponse = await fetch(`/api/itineraries/${itinerary.id}/crew`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crew: crewMembers.map((c) => ({
            role: c.role,
            full_name: c.full_name || undefined,
            notes: c.notes || undefined,
          })),
        }),
      })

      if (!crewResponse.ok) {
        const error = await crewResponse.json()
        throw new Error(error.error || "Failed to save crew")
      }

      toast({
        title: "Success",
        description: "Itinerary updated successfully",
      })

      if (onSuccess) {
        onSuccess()
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save itinerary",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setPassengers([])
    setCrewMembers([])
    setPassengerSearch("")
    setPassengerComboboxOpen(null)
    setShowCreatePassengerForm(false)
    setNewPassengerData({ full_name: "", email: "", phone: "", company: "" })
  }, [onOpenChange])

  // Filter passengers based on search
  const filteredPassengers = availablePassengers.filter((passenger) => {
    if (!passengerSearch) return true
    const search = passengerSearch.toLowerCase()
    return (
      passenger.full_name.toLowerCase().includes(search) ||
      passenger.email.toLowerCase().includes(search) ||
      (passenger.company && passenger.company.toLowerCase().includes(search))
    )
  })

  const getPassengerById = (passengerId: string) => {
    return availablePassengers.find((p) => p.id === passengerId)
  }

  const remainingPassengerSlots = itinerary.total_pax - passengers.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[60vw] sm:max-w-[92vw] md:max-w-[60vw] lg:max-w-[60vw] max-h-[95vh] p-5 flex flex-col overflow-hidden bg-background backdrop-blur-xl border shadow-2xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted border border-border">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Edit Itinerary
                </DialogTitle>
                <DialogDescription className="text-base mt-1 text-muted-foreground">
                  Add passengers and crew members to this itinerary
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 px-1">
          {/* Passengers Section */}
          <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm hover:shadow-md transition-shadow mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold text-lg text-foreground">Passengers</h4>
                  <Badge variant="outline" className="text-xs">
                    {passengers.length} / {itinerary.total_pax}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPassengerSlot}
                  disabled={passengers.length >= itinerary.total_pax}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Passenger
                </Button>
              </div>

              {passengers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No passengers added yet. Click "Add Passenger" to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {passengers.map((passengerEntry, index) => {
                    const passenger = getPassengerById(passengerEntry.passenger_id)
                    const isOpen = passengerComboboxOpen === `passenger-${index}`

                    return (
                      <div
                        key={passengerEntry.id}
                        className="border rounded-lg p-4 bg-card border-border"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={
                                passenger?.avatar_path
                                  ? `/api/avatar/passenger/${passenger.id}`
                                  : undefined
                              }
                              alt={passenger?.full_name || "Passenger"}
                            />
                            <AvatarFallback>
                              {(passenger?.full_name || "P")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Passenger Selection */}
                          <div className="flex-1">
                            <Popover
                              open={isOpen}
                              onOpenChange={(open) =>
                                setPassengerComboboxOpen(open ? `passenger-${index}` : null)
                              }
                              modal={true}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !passengerEntry.passenger_id && "text-muted-foreground"
                                  )}
                                  disabled={loadingPassengers}
                                >
                                  {passenger
                                    ? `${passenger.full_name} ${passenger.email ? `(${passenger.email})` : ""}`
                                    : loadingPassengers
                                    ? "Loading passengers..."
                                    : "Select a passenger"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[var(--radix-popover-trigger-width)] p-0"
                                align="start"
                              >
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search passengers by name, email, or company..."
                                    value={passengerSearch}
                                    onValueChange={setPassengerSearch}
                                  />
                                  <CommandList className="max-h-[300px] overflow-y-auto">
                                    <CommandEmpty>
                                      {passengerSearch ? (
                                        <div className="py-2 text-center text-sm">
                                          <p className="text-muted-foreground mb-2">
                                            No passengers found matching "{passengerSearch}"
                                          </p>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setPassengerComboboxOpen(null)
                                              setShowCreatePassengerForm(true)
                                            }}
                                            className="mt-2"
                                          >
                                            <UserPlus className="h-3 w-3 mr-2" />
                                            Create New Passenger
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="py-2 text-center text-sm">
                                          <p className="text-muted-foreground mb-2">
                                            No passengers available for this contact.
                                          </p>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setPassengerComboboxOpen(null)
                                              setShowCreatePassengerForm(true)
                                            }}
                                            className="mt-2"
                                          >
                                            <UserPlus className="h-3 w-3 mr-2" />
                                            Create New Passenger
                                          </Button>
                                        </div>
                                      )}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {filteredPassengers.map((p) => (
                                        <CommandItem
                                          key={p.id}
                                          value={p.id}
                                          onSelect={() => handleSelectPassenger(index, p.id)}
                                        >
                                          <div className="flex items-center gap-2 w-full">
                                            <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                src={
                                                  p.avatar_path
                                                    ? `/api/avatar/passenger/${p.id}`
                                                    : undefined
                                                }
                                                alt={p.full_name}
                                              />
                                              <AvatarFallback className="text-xs">
                                                {p.full_name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")
                                                  .toUpperCase()
                                                  .slice(0, 2)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col flex-1">
                                              <span className="font-medium">{p.full_name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {p.email}
                                                {p.company && ` • ${p.company}`}
                                              </span>
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePassenger(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Create New Passenger Form */}
              {showCreatePassengerForm && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30 border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-sm">Create New Passenger</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreatePassengerForm(false)
                        setNewPassengerData({ full_name: "", email: "", phone: "", company: "" })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Full Name *</Label>
                      <Input
                        placeholder="Enter full name"
                        value={newPassengerData.full_name}
                        onChange={(e) =>
                          setNewPassengerData({ ...newPassengerData, full_name: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Email *</Label>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        value={newPassengerData.email}
                        onChange={(e) =>
                          setNewPassengerData({ ...newPassengerData, email: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Phone</Label>
                      <Input
                        type="tel"
                        placeholder="Enter phone (optional)"
                        value={newPassengerData.phone}
                        onChange={(e) =>
                          setNewPassengerData({ ...newPassengerData, phone: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Company</Label>
                      <Input
                        placeholder="Enter company (optional)"
                        value={newPassengerData.company}
                        onChange={(e) =>
                          setNewPassengerData({ ...newPassengerData, company: e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreatePassenger}
                      disabled={creatingPassenger || !newPassengerData.full_name || !newPassengerData.email}
                    >
                      {creatingPassenger ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3 mr-2" />
                          Create & Add
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCreatePassengerForm(false)
                        setNewPassengerData({ full_name: "", email: "", phone: "", company: "" })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {remainingPassengerSlots > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {remainingPassengerSlots} passenger slot{remainingPassengerSlots !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>
          </div>

          {/* Crew Section */}
          <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-semibold text-lg text-foreground">Crew Members</h4>
              </div>

              {/* PIC */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Pilot in Command (PIC)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCrew("PIC")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add PIC
                  </Button>
                </div>
                {crewMembers
                  .filter((c) => c.role === "PIC")
                  .map((crewEntry) => {
                    const actualIndex = crewMembers.findIndex((c) => c.id === crewEntry.id)

                    return (
                      <div
                        key={crewEntry.id}
                        className="border rounded-lg p-4 bg-card border-border mb-2"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              <div>
                                <Label className="text-sm mb-2 block">Role</Label>
                                <div className="text-sm font-medium text-muted-foreground">{crewEntry.role}</div>
                              </div>
                              <div>
                                <Label className="text-sm mb-1 block">Full Name</Label>
                                <Input
                                  placeholder="Enter crew member name (optional)"
                                  value={crewEntry.full_name || ""}
                                  onChange={(e) => handleUpdateCrewName(actualIndex, e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCrew(actualIndex)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Label className="text-sm mb-1 block">Notes</Label>
                            <Textarea
                              placeholder="Enter notes (optional)"
                              value={crewEntry.notes || ""}
                              onChange={(e) => handleUpdateCrewNotes(actualIndex, e.target.value)}
                              className="text-sm min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* SIC */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Second in Command (SIC)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCrew("SIC")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add SIC
                  </Button>
                </div>
                {crewMembers
                  .filter((c) => c.role === "SIC")
                  .map((crewEntry) => {
                    const actualIndex = crewMembers.findIndex((c) => c.id === crewEntry.id)

                    return (
                      <div
                        key={crewEntry.id}
                        className="border rounded-lg p-4 bg-card border-border mb-2"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              <div>
                                <Label className="text-sm mb-2 block">Role</Label>
                                <div className="text-sm font-medium text-muted-foreground">{crewEntry.role}</div>
                              </div>
                              <div>
                                <Label className="text-sm mb-1 block">Full Name</Label>
                                <Input
                                  placeholder="Enter crew member name (optional)"
                                  value={crewEntry.full_name || ""}
                                  onChange={(e) => handleUpdateCrewName(actualIndex, e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCrew(actualIndex)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Label className="text-sm mb-1 block">Notes</Label>
                            <Textarea
                              placeholder="Enter notes (optional)"
                              value={crewEntry.notes || ""}
                              onChange={(e) => handleUpdateCrewNotes(actualIndex, e.target.value)}
                              className="text-sm min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Cabin Attendance */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Cabin Attendance</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCrew("Cabin Attendance")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cabin Attendance
                  </Button>
                </div>
                {crewMembers
                  .filter((c) => c.role === "Cabin Attendance")
                  .map((crewEntry) => {
                    const actualIndex = crewMembers.findIndex((c) => c.id === crewEntry.id)

                    return (
                      <div
                        key={crewEntry.id}
                        className="border rounded-lg p-4 bg-card border-border mb-2"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-4">
                              <div>
                                <Label className="text-sm mb-2 block">Role</Label>
                                <div className="text-sm font-medium text-muted-foreground">{crewEntry.role}</div>
                              </div>
                              <div>
                                <Label className="text-sm mb-1 block">Full Name</Label>
                                <Input
                                  placeholder="Enter crew member name (optional)"
                                  value={crewEntry.full_name || ""}
                                  onChange={(e) => handleUpdateCrewName(actualIndex, e.target.value)}
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCrew(actualIndex)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div>
                            <Label className="text-sm mb-1 block">Notes</Label>
                            <Textarea
                              placeholder="Enter notes (optional)"
                              value={crewEntry.notes || ""}
                              onChange={(e) => handleUpdateCrewNotes(actualIndex, e.target.value)}
                              className="text-sm min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          <Button variant="outline" onClick={handleClose} className="min-w-[100px]">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[200px] shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
