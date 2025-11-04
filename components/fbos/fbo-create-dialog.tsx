"use client"

import type React from "react"

import { useState } from "react"
import { useMockStore } from "@/lib/mock/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { FBO } from "@/lib/types"

interface FBOCreateDialogProps {
  children: React.ReactNode
}

export function FBOCreateDialog({ children }: FBOCreateDialogProps) {
  const { dispatch } = useMockStore()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    airportCode: "",
    airportName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  })
  const [services, setServices] = useState<string[]>([])
  const [serviceInput, setServiceInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newFBO: FBO = {
      id: `fbo-${Date.now()}`,
      ...formData,
      services,
    }

    dispatch({ type: "ADD_FBO", payload: newFBO })
    setOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      airportCode: "",
      airportName: "",
      address: "",
      phone: "",
      email: "",
      website: "",
    })
    setServices([])
    setServiceInput("")
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New FBO</DialogTitle>
          <DialogDescription>Add a new Fixed Base Operator to your directory</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">FBO Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airportCode">Airport Code *</Label>
              <Input
                id="airportCode"
                value={formData.airportCode}
                onChange={(e) => setFormData({ ...formData, airportCode: e.target.value.toUpperCase() })}
                placeholder="e.g., TEB"
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="airportName">Airport Name *</Label>
            <Input
              id="airportName"
              value={formData.airportName}
              onChange={(e) => setFormData({ ...formData, airportName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="services">Services Offered</Label>
            <div className="flex gap-2">
              <Input
                id="services"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add FBO</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
