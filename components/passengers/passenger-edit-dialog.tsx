"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useMockStore } from "@/lib/mock/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Passenger } from "@/lib/types"

interface PassengerEditDialogProps {
  passenger: Passenger
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PassengerEditDialog({ passenger, open, onOpenChange }: PassengerEditDialogProps) {
  const { dispatch } = useMockStore()
  const [formData, setFormData] = useState({
    name: passenger.name,
    email: passenger.email,
    phone: passenger.phone,
    company: passenger.company || "",
    specialRequests: passenger.specialRequests || "",
    dietaryRestrictions: passenger.dietaryRestrictions || "",
    accessibilityNeeds: passenger.accessibilityNeeds || "",
  })

  useEffect(() => {
    setFormData({
      name: passenger.name,
      email: passenger.email,
      phone: passenger.phone,
      company: passenger.company || "",
      specialRequests: passenger.specialRequests || "",
      dietaryRestrictions: passenger.dietaryRestrictions || "",
      accessibilityNeeds: passenger.accessibilityNeeds || "",
    })
  }, [passenger])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updatedPassenger: Passenger = {
      ...passenger,
      ...formData,
      updatedAt: new Date().toISOString(),
    }

    dispatch({ type: "UPDATE_PASSENGER", payload: updatedPassenger })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Passenger</DialogTitle>
          <DialogDescription>Update the passenger profile information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-company">Company</Label>
            <Input
              id="edit-company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-specialRequests">Special Requests</Label>
            <Textarea
              id="edit-specialRequests"
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              placeholder="Window seat, extra legroom, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dietaryRestrictions">Dietary Restrictions</Label>
            <Textarea
              id="edit-dietaryRestrictions"
              value={formData.dietaryRestrictions}
              onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
              placeholder="Vegetarian, gluten-free, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-accessibilityNeeds">Accessibility Needs</Label>
            <Textarea
              id="edit-accessibilityNeeds"
              value={formData.accessibilityNeeds}
              onChange={(e) => setFormData({ ...formData, accessibilityNeeds: e.target.value })}
              placeholder="Wheelchair assistance, etc."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
