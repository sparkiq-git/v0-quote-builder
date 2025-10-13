"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Edit, UserCog, Plus, Mail, Phone, Clock, Plane } from "lucide-react"
import { useMockStore } from "@/lib/mock/store"
import { useToast } from "@/hooks/use-toast"
import { CrewCreateDialog } from "./crew-create-dialog"

const roleLabels = {
  PIC: "Captain",
  SIC: "First Officer",
  FA: "Flight Attendant",
  Ground: "Ground Crew",
}

export function CrewGrid() {
  const { state } = useMockStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [editCrewId, setEditCrewId] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const filteredCrew = (state.crewMembers || []).filter((crew) => {
    const matchesSearch =
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roleLabels[crew.role].toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || crew.role === roleFilter
    const matchesStatus = statusFilter === "all" || crew.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search crew members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="PIC">Captain</SelectItem>
            <SelectItem value="SIC">First Officer</SelectItem>
            <SelectItem value="FA">Flight Attendant</SelectItem>
            <SelectItem value="Ground">Ground Crew</SelectItem>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => value && setStatusFilter(value as "active" | "all")}
        >
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Grid View */}
      {filteredCrew.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCrew.map((crew) => {
            const initials = crew.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()

            return (
              <Card
                key={crew.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setEditCrewId(crew.id)
                  setIsEditDialogOpen(true)
                }}
              >
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={crew.avatar || "/placeholder.svg"} alt={crew.name} />
                      <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{crew.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {roleLabels[crew.role]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={crew.status === "active" ? "default" : "secondary"}>
                        {crew.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{crew.yearsOfExperience} years experience</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plane className="h-4 w-4" />
                        <span>{crew.totalFlightHours.toLocaleString()} flight hours</span>
                      </div>
                      {crew.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{crew.email}</span>
                        </div>
                      )}
                      {crew.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{crew.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <CrewCreateDialog crewId={crew.id}>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </CrewCreateDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCog className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm || roleFilter !== "all" ? "No crew members found" : "No crew members"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchTerm || roleFilter !== "all"
              ? "Try adjusting your search terms or filters."
              : "Start by adding your first crew member."}
          </p>
          {!searchTerm && roleFilter === "all" && (
            <CrewCreateDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Crew Member
              </Button>
            </CrewCreateDialog>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <CrewCreateDialog crewId={editCrewId || undefined} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
    </div>
  )
}
