"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import type { CrewMember } from "@/lib/types"
import { Plus } from "lucide-react" // Import Plus icon

interface CrewCreateDialogProps {
  children?: React.ReactNode
  crewId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CrewCreateDialog({ children, crewId, open: controlledOpen, onOpenChange }: CrewCreateDialogProps) {
  const { state, dispatch } = useMockStore()
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange! : setInternalOpen

  const [customRoleDialogOpen, setCustomRoleDialogOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")

  const existingCrew = crewId ? state.crewMembers.find((c) => c.id === crewId) : null
  const isEditing = !!existingCrew

  const [formData, setFormData] = useState<Partial<CrewMember>>({
    name: "",
    role: "PIC",
    yearsOfExperience: 0,
    totalFlightHours: 0,
    status: "active",
    phone: "",
    email: "",
  })

  useEffect(() => {
    if (existingCrew) {
      setFormData(existingCrew)
    } else {
      setFormData({
        name: "",
        role: "PIC",
        yearsOfExperience: 0,
        totalFlightHours: 0,
        status: "active",
        phone: "",
        email: "",
      })
    }
  }, [existingCrew, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (isEditing) {
      dispatch({
        type: "UPDATE_CREW_MEMBER",
        payload: { ...formData, id: crewId } as CrewMember,
      })
      toast({
        title: "Crew member updated",
        description: "The crew member has been updated successfully.",
      })
    } else {
      dispatch({
        type: "ADD_CREW_MEMBER",
        payload: {
          ...formData,
          id: `crew-${Date.now()}`,
        } as CrewMember,
      })
      toast({
        title: "Crew member added",
        description: "The crew member has been added successfully.",
      })
    }

    setOpen(false)
  }

  const handleAddCustomRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a role name.",
        variant: "destructive",
      })
      return
    }

    dispatch({
      type: "ADD_CUSTOM_CREW_ROLE",
      payload: newRoleName.trim(),
    })

    setFormData({ ...formData, role: newRoleName.trim() })
    setNewRoleName("")
    setCustomRoleDialogOpen(false)

    toast({
      title: "Custom role added",
      description: `"${newRoleName.trim()}" has been added to the role list.`,
    })
  }

  const allRoles = [
    { value: "PIC", label: "Captain (PIC)" },
    { value: "SIC", label: "First Officer (SIC)" },
    { value: "FA", label: "Flight Attendant" },
    { value: "Ground", label: "Ground Crew" },
    ...(state.customCrewRoles || []).map((role) => ({ value: role, label: role })),
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit Crew Member" : "Add Crew Member"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Update the crew member information." : "Add a new crew member to your roster."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Captain John Smith"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomRoleDialogOpen(true)}
                    title="Add custom role"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.yearsOfExperience}
                    onChange={(e) =>
                      setFormData({ ...formData, yearsOfExperience: Number.parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="flightHours">Total Flight Hours</Label>
                  <Input
                    id="flightHours"
                    type="number"
                    min="0"
                    value={formData.totalFlightHours}
                    onChange={(e) =>
                      setFormData({ ...formData, totalFlightHours: Number.parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Update" : "Add"} Crew Member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={customRoleDialogOpen} onOpenChange={setCustomRoleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Custom Role</DialogTitle>
            <DialogDescription>Enter a name for the new crew role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Chief Pilot, Mechanic"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustomRole()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddCustomRole}>
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
