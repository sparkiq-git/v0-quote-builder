"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Edit, Trash2, Users, Gauge, Plane, DollarSign } from "lucide-react"
import type { AircraftType } from "@/lib/types"
import { useMockStore } from "@/lib/mock/store"
import { formatCurrency } from "@/lib/utils/format"
import { useToast } from "@/hooks/use-toast"

interface AircraftTypeCardProps {
  aircraft: AircraftType
}

export function AircraftTypeCard({ aircraft }: AircraftTypeCardProps) {
  const { dispatch } = useMockStore()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(aircraft)

  const handleSave = () => {
    dispatch({
      type: "UPDATE_AIRCRAFT_TYPE",
      payload: { id: aircraft.id, updates: editForm },
    })
    setIsEditing(false)
    toast({
      title: "Aircraft updated",
      description: "The aircraft type has been successfully updated.",
    })
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this aircraft type?")) {
      dispatch({
        type: "DELETE_AIRCRAFT_TYPE",
        payload: aircraft.id,
      })
      toast({
        title: "Aircraft deleted",
        description: "The aircraft type has been removed from your catalog.",
      })
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "light jet":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "mid-size jet":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "heavy jet":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {aircraft.images.length > 1 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {aircraft.images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-video relative">
                    <img
                      src={`${image}&query=${encodeURIComponent(aircraft.name + " aircraft")}`}
                      alt={`${aircraft.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        ) : (
          <div className="aspect-video relative">
            <img
              src={`${aircraft.images[0]}&query=${encodeURIComponent(aircraft.name + " aircraft")}`}
              alt={aircraft.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <Badge className={`absolute top-2 left-2 ${getCategoryColor(aircraft.category)}`}>{aircraft.category}</Badge>
      </div>

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{aircraft.name}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              {aircraft.category}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-full md:max-w-[65rem] overflow-y-auto max-h-[100vh]">
                <DialogHeader>
                  <DialogTitle>Edit Aircraft Type</DialogTitle>
                  <DialogDescription>Make changes to the aircraft specifications.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Aircraft Name</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Light Jet">Light Jet</SelectItem>
                        <SelectItem value="Mid-Size Jet">Mid-Size Jet</SelectItem>
                        <SelectItem value="Heavy Jet">Heavy Jet</SelectItem>
                        <SelectItem value="Turboprop">Turboprop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={editForm.capacity}
                        onChange={(e) => setEditForm({ ...editForm, capacity: Number.parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="range">Range (nm)</Label>
                      <Input
                        id="range"
                        type="number"
                        value={editForm.range}
                        onChange={(e) => setEditForm({ ...editForm, range: Number.parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={editForm.hourlyRate}
                      onChange={(e) => setEditForm({ ...editForm, hourlyRate: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{aircraft.capacity}</p>
              <p className="text-xs text-muted-foreground">Passengers</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{aircraft.range.toLocaleString()} nm</p>
              <p className="text-xs text-muted-foreground">Range</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Hourly Rate</span>
            </div>
            <span className="font-semibold">{formatCurrency(aircraft.hourlyRate)}/hr</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
