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
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { FBO } from "@/lib/types"

interface FBOEditDialogProps {
  fbo: FBO
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FBOEditDialog({ fbo, open, onOpenChange }: FBOEditDialogProps) {
  const { dispatch } = useMockStore()
  const [formData, setFormData] = useState({
    name: fbo.name,
    airportCode: fbo.airportCode,
    airportName: fbo.airportName,
    address: fbo.address,
    phone: fbo.phone,
    email: fbo.email,
    website: fbo.website || "",
  })
  const [services, setServices] = useState<string[]>(fbo.services)
  const [serviceInput, setServiceInput] = useState("")

  useEffect(() => {
    setFormData({
      name: fbo.name,
      airportCode: fbo.airportCode,
      airportName: fbo.airportName,
      address: fbo.address,
      phone: fbo.phone,
      email: fbo.email,
      website: fbo.website || "",
    })
    setServices(fbo.services)
  }, [fbo])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updatedFBO: FBO = {
      ...fbo,
      ...formData,
      services,
    }

    dispatch({ type: "UPDATE_FBO", payload: updatedFBO })
    onOpenChange(false)
  }

  const addService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices([...services, serviceInput.trim()])
      setServiceInput("")
    }
  }

  const removeService = (service: string) => {
    setServices(services.filter((s) => s !== service))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit FBO</DialogTitle>
          <DialogDescription>Update the Fixed Base Operator information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">FBO Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-airportCode">Airport Code *</Label>
              <Input
                id="edit-airportCode"
                value={formData.airportCode}
                onChange={(e) => setFormData({ ...formData, airportCode: e.target.value.toUpperCase() })}
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-airportName">Airport Name *</Label>
            <Input
              id="edit-airportName"
              value={formData.airportName}
              onChange={(e) => setFormData({ ...formData, airportName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Address *</Label>
            <Textarea
              id="edit-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-website">Website</Label>
            <Input
              id="edit-website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-services">Services Offered</Label>
            <div className="flex gap-2">
              <Input
                id="edit-services"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
                placeholder="Add a service and press Enter"
              />
              <Button type="button" onClick={addService} variant="secondary">
                Add
              </Button>
            </div>
            {services.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {services.map((service) => (
                  <Badge key={service} variant="secondary">
                    {service}
                    <button
                      type="button"
                      onClick={() => removeService(service)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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
